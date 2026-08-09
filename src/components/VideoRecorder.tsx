'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

const MAX_RECORDING_SECONDS = 90;

interface RecordingState {
  status: 'idle' | 'requesting' | 'previewing' | 'recording' | 'paused' | 'stopped' | 'error' | 'uploading' | 'processing' | 'done';
  errorMessage: string | null;
  timeRemaining: number;
  recordedTime: number;
  downloadUrl: string | null;
  progressLabel: string;
}

export default function VideoRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<RecordingState>({
    status: 'idle',
    errorMessage: null,
    timeRemaining: MAX_RECORDING_SECONDS,
    recordedTime: 0,
    downloadUrl: null,
    progressLabel: '',
  });
  const [touchStartTime, setTouchStartTime] = useState(0);

  const statusId = 'video-recorder-status';

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

  const cleanupRecording = useCallback(() => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    if (state.downloadUrl) {
      URL.revokeObjectURL(state.downloadUrl);
    }
  }, [clearTimer, state.downloadUrl]);

  useEffect(() => {
    return () => {
      cleanupRecording();
      stopMediaStream();
      if (state.downloadUrl) {
        URL.revokeObjectURL(state.downloadUrl);
      }
    };
  }, [cleanupRecording, stopMediaStream, state.downloadUrl]);

  const startPreview = async () => {
    setState((prev) => ({
      ...prev,
      status: 'requesting',
      errorMessage: null,
      timeRemaining: MAX_RECORDING_SECONDS,
      recordedTime: 0,
      downloadUrl: null,
      progressLabel: '',
    }));

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

      setState((prev) => ({
        ...prev,
        status: 'previewing',
        timeRemaining: MAX_RECORDING_SECONDS,
        recordedTime: 0,
        downloadUrl: null,
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error accessing camera/microphone';
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: message,
      }));
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
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setState((prev) => ({
        ...prev,
        status: 'stopped',
        downloadUrl: url,
      }));
    };

    mediaRecorder.onerror = () => {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Recording error occurred.',
      }));
    };

    mediaRecorder.start(1000); // collect every 1s

    setState((prev) => ({
      ...prev,
      status: 'recording',
      timeRemaining: MAX_RECORDING_SECONDS,
      recordedTime: 0,
      downloadUrl: null,
    }));

    timerRef.current = setInterval(() => {
      setState((prev) => {
        const nextRecorded = prev.recordedTime + 1;
        const nextRemaining = Math.max(0, MAX_RECORDING_SECONDS - nextRecorded);

        if (nextRemaining <= 0) {
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== 'inactive'
          ) {
            mediaRecorderRef.current.stop();
          }
          clearTimer();
          return {
            ...prev,
            status: 'stopped',
            recordedTime: nextRecorded,
            timeRemaining: 0,
          };
        }

        return {
          ...prev,
          recordedTime: nextRecorded,
          timeRemaining: nextRemaining,
        };
      });
    }, 1000);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      clearTimer();
      setState((prev) => ({ ...prev, status: 'paused' }));
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setState((prev) => {
          const nextRecorded = prev.recordedTime + 1;
          const nextRemaining = Math.max(0, MAX_RECORDING_SECONDS - nextRecorded);

          if (nextRemaining <= 0) {
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state !== 'inactive'
            ) {
              mediaRecorderRef.current.stop();
            }
            clearTimer();
            return {
              ...prev,
              status: 'stopped',
              recordedTime: nextRecorded,
              timeRemaining: 0,
            };
          }

          return {
            ...prev,
            recordedTime: nextRecorded,
            timeRemaining: nextRemaining,
          };
        });
      }, 1000);
      setState((prev) => ({ ...prev, status: 'recording' }));
    }
  };

  const stopRecording = () => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // onstop handler will transition status to 'stopped'
  };

  const resetAll = () => {
    cleanupRecording();
    stopMediaStream();
    setState({
      status: 'idle',
      errorMessage: null,
      timeRemaining: MAX_RECORDING_SECONDS,
      recordedTime: 0,
      downloadUrl: null,
      progressLabel: '',
    });
  };

  const saveToDatabase = async () => {
    if (!state.downloadUrl) return;

    try {
      setState((prev) => ({ ...prev, status: 'uploading', progressLabel: 'Uploading video…' }));

      // Fetch the blob from the object URL
      const response = await fetch(state.downloadUrl);
      const blob = await response.blob();

      const mimeType = getSupportedMimeType();
      const filename = `standup-${Date.now()}.webm`;
      const file = new File([blob], filename, { type: mimeType });

      // 1. Upload video
      const uploadForm = new FormData();
      uploadForm.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${uploadRes.status})`);
      }

      const { video_url: videoUrl } = (await uploadRes.json()) as { video_url: string };

      // 2. Create standup record (pending)
      const standupRes = await fetch('/api/standups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl,
          status: 'pending',
        }),
      });

      if (!standupRes.ok) {
        const err = await standupRes.json().catch(() => ({}));
        throw new Error(err.error || `Standup create failed (${standupRes.status})`);
      }

      const standup = (await standupRes.json()) as { id: string };

      // 3. Transcribe
      setState((prev) => ({ ...prev, status: 'processing', progressLabel: 'Transcribing with Whisper…' }));

      const transcribeForm = new FormData();
      transcribeForm.append('file', file);

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: transcribeForm,
      });

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json().catch(() => ({}));
        throw new Error(err.error || `Transcription failed (${transcribeRes.status})`);
      }

      const { transcript, duration } = (await transcribeRes.json()) as {
        transcript: string;
        duration?: number;
      };

      // Update standup with transcript + status processing
      await fetch('/api/standups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: standup.id,
          transcript,
          duration: Math.round(duration ?? state.recordedTime),
          status: 'processing',
        }),
      });

      // 4. Summarize
      setState((prev) => ({ ...prev, progressLabel: 'Summarizing with GPT…' }));

      const summarizeRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          standup_id: standup.id,
          user_id: standup.id,
        }),
      });

      if (!summarizeRes.ok) {
        const err = await summarizeRes.json().catch(() => ({}));
        throw new Error(err.error || `Summarization failed (${summarizeRes.status})`);
      }

      // Summarize endpoint auto-updates DB with summary fields + status 'completed'
      setState((prev) => ({ ...prev, status: 'done', progressLabel: 'Standup saved!' }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Save pipeline error:', message);
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: message,
      }));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const timerColor =
    state.timeRemaining <= 10 ? 'text-[#E8634B]' : 'text-[#5A7D3F]';

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        id={statusId}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {state.status === 'requesting'
          ? 'Requesting camera and microphone permissions.'
          : state.status === 'uploading'
          ? state.progressLabel
          : state.status === 'processing'
          ? state.progressLabel
          : state.status === 'done'
          ? 'Standup saved successfully.'
          : state.status === 'error'
          ? `Error: ${state.errorMessage}`
          : `Recording status: ${state.status}`}
      </div>
      <div className="rounded-2xl overflow-hidden border border-[#2A6FBB]/20 shadow-2xl bg-[#1A1D2E]">
        {/* Video area */}
        <div
          className="relative aspect-video bg-black touch-pan-y"
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              setTouchStartTime(Date.now());
            }
          }}
          onTouchEnd={(e) => {
            const diff = Date.now() - touchStartTime;
            if (diff < 200 && e.changedTouches.length === 1) {
              // Tap to toggle controls
              if (videoRef.current) {
                if (videoRef.current.paused) videoRef.current.play();
                else videoRef.current.pause();
              }
            }
          }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            controls={state.status === 'stopped' && state.downloadUrl ? true : false}
            src={state.status === 'stopped' && state.downloadUrl ? state.downloadUrl : undefined}
          />

          {/* Overlay for idle / requesting / uploading / processing */}
          {(state.status === 'idle' || state.status === 'requesting' || state.status === 'uploading' || state.status === 'processing') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1D2E]/80 text-[#F9F7F2]">
              <div className="w-16 h-16 mb-4 rounded-full border-4 border-[#2A6FBB]/30 border-t-[#2A6FBB] animate-spin" />
              <p className="text-sm font-medium">
                {state.status === 'requesting'
                  ? 'Requesting camera & microphone...'
                  : state.status === 'uploading'
                  ? state.progressLabel
                  : state.status === 'processing'
                  ? state.progressLabel
                  : 'Ready to record'}
              </p>
            </div>
          )}

          {/* Done overlay */}
          {state.status === 'done' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1D2E]/90 text-[#F9F7F2]">
              <div className="w-16 h-16 mb-4 rounded-full bg-[#5A7D3F]/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#5A7D3F]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium">{state.progressLabel}</p>
            </div>
          )}

          {/* Error overlay */}
          {state.status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1D2E]/90 text-[#F9F7F2] px-6 text-center">
              <p className="text-3xl mb-2">⚠️</p>
              <p className="text-sm text-[#E8634B] font-semibold mb-1">Error</p>
              <p className="text-xs text-[#6B7280] max-w-xs">{state.errorMessage}</p>
            </div>
          )}

          {/* Timer badge */}
          {(state.status === 'recording' || state.status === 'paused') && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
              <span
                className={`w-2 h-2 rounded-full ${
                  state.status === 'recording' ? 'bg-[#E8634B] animate-pulse' : 'bg-[#6B7280]'
                }`}
              />
              <span className={`font-mono text-sm font-bold ${timerColor}`}>
                {formatTime(state.timeRemaining)}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-5 flex flex-wrap items-center justify-center gap-3 bg-[#13151f]">
          {state.status === 'idle' && (
            <button
              onClick={startPreview}
              aria-label="Start camera preview"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2A6FBB] text-white font-semibold text-sm hover:bg-[#1f5a9c] transition-colors shadow-lg shadow-[#2A6FBB]/20 focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40"
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
                aria-label="Start recording video"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E8634B] text-white font-semibold text-sm hover:bg-[#d9553f] transition-colors shadow-lg shadow-[#E8634B]/20 focus:outline-none focus:ring-2 focus:ring-[#E8634B]/40"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Record
              </button>
              <button
                onClick={resetAll}
                aria-label="Cancel recording"
                className="px-5 py-3 rounded-xl border border-[#6B7280]/40 text-[#6B7280] text-sm font-medium hover:text-[#F9F7F2] hover:border-[#F9F7F2]/30 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B7280]/40"
              >
                Cancel
              </button>
            </>
          )}

          {state.status === 'recording' && (
            <>
              <button
                onClick={pauseRecording}
                aria-label="Pause recording"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#6B7280] text-white font-semibold text-sm hover:bg-[#5a636e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B7280]/40"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </button>
              <button
                onClick={stopRecording}
                aria-label="Stop recording"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E8634B] text-white font-semibold text-sm hover:bg-[#d9553f] transition-colors shadow-lg shadow-[#E8634B]/20 focus:outline-none focus:ring-2 focus:ring-[#E8634B]/40"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
                Stop
              </button>
            </>
          )}

          {state.status === 'paused' && (
            <>
              <button
                onClick={resumeRecording}
                aria-label="Resume recording"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#5A7D3F] text-white font-semibold text-sm hover:bg-[#4c6b35] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5A7D3F]/40"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Resume
              </button>
              <button
                onClick={stopRecording}
                aria-label="Stop recording"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E8634B] text-white font-semibold text-sm hover:bg-[#d9553f] transition-colors shadow-lg shadow-[#E8634B]/20 focus:outline-none focus:ring-2 focus:ring-[#E8634B]/40"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
                Stop
              </button>
            </>
          )}

          {state.status === 'stopped' && (
            <>
              <a
                href={state.downloadUrl || '#'}
                download={`standup-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`}
                aria-label="Download recorded video"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2A6FBB] text-white font-semibold text-sm hover:bg-[#1f5a9c] transition-colors shadow-lg shadow-[#2A6FBB]/20 focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Video
              </a>
              <button
                onClick={saveToDatabase}
                aria-label="Save standup to database"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5A7D3F] text-white font-semibold text-sm hover:bg-[#4c6b35] transition-colors shadow-lg shadow-[#5A7D3F]/20 focus:outline-none focus:ring-2 focus:ring-[#5A7D3F]/40"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 7-13.5" />
                </svg>
                Save Standup
              </button>
              <button
                onClick={resetAll}
                aria-label="Record another standup"
                className="px-5 py-3 rounded-xl border border-[#6B7280]/40 text-[#6B7280] text-sm font-medium hover:text-[#F9F7F2] hover:border-[#F9F7F2]/30 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B7280]/40"
              >
                Record Another
              </button>
            </>
          )}

          {(state.status === 'uploading' || state.status === 'processing') && (
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <div className="w-4 h-4 rounded-full border-2 border-[#2A6FBB]/30 border-t-[#2A6FBB] animate-spin" />
              {state.progressLabel}
            </div>
          )}

          {state.status === 'done' && (
            <button
              onClick={resetAll}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2A6FBB] text-white font-semibold text-sm hover:bg-[#1f5a9c] transition-colors shadow-lg shadow-[#2A6FBB]/20"
            >
              Record Another Standup
            </button>
          )}

          {state.status === 'error' && (
            <button
              onClick={resetAll}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2A6FBB] text-white font-semibold text-sm hover:bg-[#1f5a9c] transition-colors shadow-lg shadow-[#2A6FBB]/20"
            >
              Try Again
            </button>
          )}
        </div>
      </div>

      {/* Helper text */}
      <div className="mt-4 text-center">
        <p className="text-xs text-[#6B7280]">
          Max {MAX_RECORDING_SECONDS}s per standup · Uses your browser&apos;s camera and microphone ·
          All processing happens on the server
        </p>
      </div>
    </div>
  );
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}
