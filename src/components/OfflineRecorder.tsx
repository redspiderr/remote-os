'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { saveRecording, markRecordingSynced, isOnline, registerSync } from '@/lib/offline-storage';

const MAX_RECORDING_SECONDS = 90;

type RecordingStatus = 'idle' | 'requesting' | 'previewing' | 'recording' | 'stopped' | 'error' | 'uploading' | 'done';

interface RecorderState {
  status: RecordingStatus;
  errorMessage: string | null;
  timeRemaining: number;
  recordedTime: number;
  downloadUrl: string | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'video/webm';
}

export default function OfflineRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<RecorderState>({
    status: 'idle',
    errorMessage: null,
    timeRemaining: MAX_RECORDING_SECONDS,
    recordedTime: 0,
    downloadUrl: null,
  });
  const [isOffline, setIsOffline] = useState(!isOnline());

  useEffect(() => {
    const handler = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    return () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopMediaStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      cleanup();
      stopMediaStream();
      if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
    };
  }, [cleanup, stopMediaStream, state.downloadUrl]);

  const startPreview = async () => {
    setState({
      status: 'requesting',
      errorMessage: null,
      timeRemaining: MAX_RECORDING_SECONDS,
      recordedTime: 0,
      downloadUrl: null,
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      setState((prev) => ({ ...prev, status: 'previewing' }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Camera/microphone access denied';
      setState((prev) => ({ ...prev, status: 'error', errorMessage: message }));
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    const mimeType = getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType,
      videoBitsPerSecond: 2500000,
    });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setState((prev) => ({ ...prev, status: 'stopped', downloadUrl: url }));
    };

    mediaRecorder.start(1000);
    setState((prev) => ({ ...prev, status: 'recording', timeRemaining: MAX_RECORDING_SECONDS, recordedTime: 0 }));

    timerRef.current = setInterval(() => {
      setState((prev) => {
        const nextRecorded = prev.recordedTime + 1;
        const nextRemaining = Math.max(0, MAX_RECORDING_SECONDS - nextRecorded);
        if (nextRemaining <= 0) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          clearTimer();
          return { ...prev, status: 'stopped', recordedTime: nextRecorded, timeRemaining: 0 };
        }
        return { ...prev, recordedTime: nextRecorded, timeRemaining: nextRemaining };
      });
    }, 1000);
  };

  const stopRecording = () => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const resetAll = () => {
    cleanup();
    stopMediaStream();
    if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
    setState({
      status: 'idle',
      errorMessage: null,
      timeRemaining: MAX_RECORDING_SECONDS,
      recordedTime: 0,
      downloadUrl: null,
    });
  };

  const saveStandup = async () => {
    if (!state.downloadUrl) return;
    setState((prev) => ({ ...prev, status: 'uploading' }));
    try {
      const resp = await fetch(state.downloadUrl);
      const blob = await resp.blob();

      if (!isOnline()) {
        // Save locally for later sync
        await saveRecording({
          blob,
          durationSeconds: state.recordedTime,
          synced: false,
        });
        await registerSync();
        setState((prev) => ({ ...prev, status: 'done' }));
        return;
      }

      // Online: upload directly
      const mimeType = getSupportedMimeType();
      const filename = `standup-${Date.now()}.webm`;
      const file = new File([blob], filename, { type: mimeType });
      const form = new FormData();
      form.append('file', file);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: form });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { video_url: videoUrl } = (await uploadRes.json()) as { video_url: string };

      await fetch('/api/standups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl, status: 'pending' }),
      });

      setState((prev) => ({ ...prev, status: 'done' }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, status: 'error', errorMessage: message }));
    }
  };

  const timerColor = state.timeRemaining <= 10 ? 'text-[#E8634B]' : 'text-[#5A7D3F]';

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Offline badge */}
      {isOffline && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-2 text-xs text-[#E8634B]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          Offline mode — recording will be saved locally and synced when you’re back online.
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-[#2A6FBB]/20 shadow-2xl bg-[#1A1D2E]">
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            controls={state.status === 'stopped' && state.downloadUrl ? true : false}
            src={state.status === 'stopped' && state.downloadUrl ? state.downloadUrl : undefined}
          />

          {(state.status === 'idle' || state.status === 'requesting' || state.status === 'uploading') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1D2E]/80 text-[#F9F7F2]">
              <div className="w-12 h-12 mb-3 rounded-full border-4 border-[#2A6FBB]/30 border-t-[#2A6FBB] animate-spin" />
              <p className="text-sm font-medium">
                {state.status === 'requesting' ? 'Requesting camera…' : state.status === 'uploading' ? 'Saving…' : 'Ready to record'}
              </p>
            </div>
          )}

          {state.status === 'done' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1D2E]/90 text-[#F9F7F2]">
              <div className="w-12 h-12 mb-3 rounded-full bg-[#5A7D3F]/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#5A7D3F]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium">{isOffline ? 'Saved offline — will sync later' : 'Saved!'}</p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1D2E]/90 text-[#F9F7F2] px-6 text-center">
              <p className="text-2xl mb-2">⚠️</p>
              <p className="text-sm text-[#E8634B] font-semibold mb-1">Error</p>
              <p className="text-xs text-[#6B7280] max-w-xs">{state.errorMessage}</p>
            </div>
          )}

          {(state.status === 'recording') && (
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#E8634B] animate-pulse" />
              <span className={`font-mono text-sm font-bold ${timerColor}`}>{formatTime(state.timeRemaining)}</span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-wrap items-center justify-center gap-3 bg-[#13151f]">
          {state.status === 'idle' && (
            <button
              onClick={startPreview}
              aria-label="Start camera preview"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A6FBB] text-white font-semibold text-sm hover:bg-[#1f5a9c] transition-colors shadow-lg shadow-[#2A6FBB]/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Start Recording
            </button>
          )}

          {state.status === 'previewing' && (
            <>
              <button
                onClick={startRecording}
                aria-label="Start recording"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8634B] text-white font-semibold text-sm hover:bg-[#d9553f] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Record
              </button>
              <button
                onClick={resetAll}
                aria-label="Cancel"
                className="px-4 py-2.5 rounded-xl border border-[#6B7280]/40 text-[#6B7280] text-sm font-medium hover:text-[#F9F7F2] transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {state.status === 'recording' && (
            <>
              <button
                onClick={stopRecording}
                aria-label="Stop recording"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E8634B] text-white font-semibold text-sm hover:bg-[#d9553f] transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Stop
              </button>
            </>
          )}

          {state.status === 'stopped' && (
            <>
              <button
                onClick={saveStandup}
                aria-label="Save standup"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5A7D3F] text-white font-semibold text-sm hover:bg-[#4a6a34] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Save Standup
              </button>
              <button
                onClick={resetAll}
                aria-label="Discard recording"
                className="px-4 py-2.5 rounded-xl border border-[#6B7280]/40 text-[#6B7280] text-sm font-medium hover:text-[#F9F7F2] transition-colors"
              >
                Discard
              </button>
            </>
          )}

          {state.status === 'done' && (
            <button
              onClick={resetAll}
              aria-label="Record another"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A6FBB] text-white font-semibold text-sm hover:bg-[#1f5a9c] transition-colors"
            >
              Record Another
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
