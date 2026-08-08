'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────

type TimerPhase = 'idle' | 'focus' | 'break' | 'completed';

interface DeepWorkGuardProps {
  minimal?: boolean;
  onPhaseChange?: (phase: TimerPhase) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Pomodoro', minutes: 25, break: 5 },
  { label: 'Deep 30', minutes: 30, break: 5 },
  { label: 'Deep 60', minutes: 60, break: 10 },
  { label: 'Deep 90', minutes: 90, break: 15 },
];

const DEFAULT_SITES = [
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'reddit.com',
  'youtube.com',
  'tiktok.com',
  'news.ycombinator.com',
];

const STORAGE_KEYS = {
  sites: 'deepwork_sites',
  stats: 'deepwork_stats',
};

// ─── Helpers ────────────────────────────────────────────────────────────

function loadSites(): string[] {
  if (typeof window === 'undefined') return DEFAULT_SITES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.sites);
    return raw ? JSON.parse(raw) : DEFAULT_SITES;
  } catch {
    return DEFAULT_SITES;
  }
}

function saveSites(sites: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.sites, JSON.stringify(sites));
}

function loadLocalStats(): { sessionsToday: number; lastDate: string } {
  if (typeof window === 'undefined') return { sessionsToday: 0, lastDate: '' };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.stats);
    if (!raw) return { sessionsToday: 0, lastDate: '' };
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.lastDate === today) return parsed;
    return { sessionsToday: 0, lastDate: today };
  } catch {
    return { sessionsToday: 0, lastDate: '' };
  }
}

function bumpLocalStats() {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().slice(0, 10);
  const current = loadLocalStats();
  const next = {
    sessionsToday: current.lastDate === today ? current.sessionsToday + 1 : 1,
    lastDate: today,
  };
  localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(next));
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = (window as unknown as Record<string, unknown>).AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new (AudioCtx as new () => AudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.4); // G5
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.3);
  } catch {
    // silently fail if audio is blocked
  }
}

// ─── Progress Circle ────────────────────────────────────────────────────

function ProgressCircle({
  seconds,
  total,
  size = 240,
  stroke = 8,
  children,
}: {
  seconds: number;
  total: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = total > 0 ? (total - seconds) / total : 0;
  const dashoffset = circumference - progress * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className="text-[#1A1D2E]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className="text-[#2A6FBB] transition-all duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ─── Distraction Blocker ────────────────────────────────────────────────

function useDistractionBlocker(enabled: boolean, sites: string[]) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      const isExternal = sites.some((s) => href.includes(s));
      if (isExternal) {
        const ok = window.confirm(
          '🛡️ Deep Work Guard\n\nYou are trying to visit a distracting site. Stay focused?'
        );
        if (!ok) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, [enabled, sites]);
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function DeepWorkGuard({ minimal = false, onPhaseChange }: DeepWorkGuardProps) {
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [task, setTask] = useState('');
  const [sites, setSites] = useState<string[]>(loadSites);
  const [showSettings, setShowSettings] = useState(false);
  const [newSite, setNewSite] = useState('');
  const [stats, setStats] = useState(loadLocalStats);
  const [serverStats, setServerStats] = useState<{ sessions: number; totalMinutes: number } | null>(null);
  const [backgroundNoise, setBackgroundNoise] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const taskRef = useRef(task);
  taskRef.current = task;

  // Fetch server stats when idle
  useEffect(() => {
    if (phase !== 'idle') return;
    let cancelled = false;
    fetch('/api/focus/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.today) {
          setServerStats(data.today);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [phase]);

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return 0;
      }
      return prev - 1;
    });
  }, []);

  useEffect(() => {
    if (phase === 'focus' || phase === 'break') {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, tick]);

  // Completion handler
  useEffect(() => {
    if (secondsLeft === 0 && (phase === 'focus' || phase === 'break')) {
      playChime();
      if (phase === 'focus') {
        bumpLocalStats();
        setStats(loadLocalStats());
        fetch('/api/focus/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: taskRef.current || undefined,
            duration: Math.round(totalSeconds / 60),
          }),
        }).catch(() => {});
        setPhase('completed');
        onPhaseChange?.('completed');
      } else {
        setPhase('idle');
        onPhaseChange?.('idle');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  useDistractionBlocker(phase === 'focus', sites);

  const startFocus = useCallback(() => {
    const total = selectedPreset.minutes * 60;
    setTotalSeconds(total);
    setSecondsLeft(total);
    setPhase('focus');
    onPhaseChange?.('focus');
  }, [selectedPreset, onPhaseChange]);

  const startBreak = useCallback(() => {
    const total = (selectedPreset.break ?? 5) * 60;
    setTotalSeconds(total);
    setSecondsLeft(total);
    setPhase('break');
    onPhaseChange?.('break');
  }, [selectedPreset, onPhaseChange]);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('idle');
    setSecondsLeft(0);
    onPhaseChange?.('idle');
  }, [onPhaseChange]);

  const addSite = useCallback(() => {
    const clean = newSite.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean || sites.includes(clean)) return;
    const next = [...sites, clean];
    setSites(next);
    saveSites(next);
    setNewSite('');
  }, [newSite, sites]);

  const removeSite = useCallback(
    (site: string) => {
      const next = sites.filter((s) => s !== site);
      setSites(next);
      saveSites(next);
    },
    [sites]
  );

  const progressPercent = useMemo(() => {
    if (totalSeconds === 0) return 0;
    return ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  }, [totalSeconds, secondsLeft]);

  const isRunning = phase === 'focus' || phase === 'break';

  // ─── Timer Core UI ───────────────────────────────────────────────────
  const TimerUI = (
    <div className="flex flex-col items-center gap-6">
      {phase === 'idle' && (
        <>
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="What are you focusing on?"
            className="w-full max-w-md px-4 py-3 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/20 text-[#F9F7F2] placeholder:text-[#6B7280] focus:outline-none focus:border-[#2A6FBB]/50 text-center text-lg"
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setSelectedPreset(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  selectedPreset.label === p.label
                    ? 'bg-[#2A6FBB] text-white border-[#2A6FBB]'
                    : 'bg-[#1A1D2E] text-[#6B7280] border-[#2A6FBB]/15 hover:text-[#F9F7F2]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={startFocus}
            className="px-8 py-3 rounded-xl bg-[#5A7D3F] text-white font-semibold text-lg hover:bg-[#5A7D3F]/90 transition-colors shadow-lg shadow-[#5A7D3F]/20"
          >
            Start Focus
          </button>
          <div className="flex items-center gap-4 text-xs text-[#6B7280]">
            <span>Today: {stats.sessionsToday} session{stats.sessionsToday !== 1 ? 's' : ''}</span>
            {serverStats && (
              <span>· Server: {serverStats.sessions} session{serverStats.sessions !== 1 ? 's' : ''} ({serverStats.totalMinutes}m)</span>
            )}
          </div>
        </>
      )}

      {isRunning && (
        <div className="flex flex-col items-center gap-6">
          <ProgressCircle seconds={secondsLeft} total={totalSeconds}>
            <div data-testid="timer-display" className="text-4xl font-mono font-bold text-[#F9F7F2] tracking-tight">
              {formatTime(secondsLeft)}
            </div>
            <div className="text-xs text-[#6B7280] mt-1 uppercase tracking-wider">
              {phase === 'focus' ? 'Deep Work' : 'Break'}
            </div>
          </ProgressCircle>
          {task && (
            <p className="text-sm text-[#F9F7F2]/70 max-w-md text-center line-clamp-2">{task}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={stop}
              className="px-5 py-2 rounded-lg bg-[#E8634B]/10 text-[#E8634B] border border-[#E8634B]/20 text-sm font-medium hover:bg-[#E8634B]/20 transition-colors"
            >
              Stop
            </button>
          </div>
          <div className="w-full max-w-xs">
            <div className="h-1.5 rounded-full bg-[#1A1D2E]">
              <div
                className="h-1.5 rounded-full bg-[#2A6FBB] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {phase === 'completed' && (
        <div className="flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#5A7D3F]/10 border border-[#5A7D3F]/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#5A7D3F]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-[#F9F7F2]">Focus session complete</p>
          <p className="text-sm text-[#6B7280]">Great work. Take a breather.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={startBreak}
              className="px-5 py-2 rounded-lg bg-[#2A6FBB] text-white text-sm font-medium hover:bg-[#2A6FBB]/90 transition-colors"
            >
              Break ({selectedPreset.break}m)
            </button>
            <button
              onClick={() => { setPhase('idle'); onPhaseChange?.('idle'); }}
              className="px-5 py-2 rounded-lg bg-[#1A1D2E] text-[#6B7280] border border-[#2A6FBB]/15 text-sm font-medium hover:text-[#F9F7F2] transition-colors"
            >
              New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Minimal Mode ────────────────────────────────────────────────────
  if (minimal) {
    return TimerUI;
  }

  // ─── Full Widget Mode ─────────────────────────────────────────────────
  return (
    <div className="w-full max-w-lg mx-auto rounded-3xl border border-[#2A6FBB]/15 bg-[#11131F] p-6 sm:p-8 shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#5A7D3F] animate-pulse" />
          <h2 className="text-sm font-semibold text-[#F9F7F2] tracking-wide">Deep Work Guard</h2>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="text-[#6B7280] hover:text-[#F9F7F2] transition-colors"
          aria-label="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.212 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {showSettings && (
        <div className="mb-6 rounded-2xl border border-[#2A6FBB]/10 bg-[#0B0D17] p-4">
          <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Blocked Sites</h3>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSite()}
              placeholder="example.com"
              className="flex-1 px-3 py-2 rounded-lg bg-[#1A1D2E] border border-[#2A6FBB]/10 text-sm text-[#F9F7F2] placeholder:text-[#6B7280] focus:outline-none focus:border-[#2A6FBB]/40"
            />
            <button
              onClick={addSite}
              className="px-3 py-2 rounded-lg bg-[#2A6FBB] text-white text-sm font-medium hover:bg-[#2A6FBB]/90"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sites.map((site) => (
              <span
                key={site}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1A1D2E] border border-[#2A6FBB]/10 text-xs text-[#6B7280]"
              >
                {site}
                <button onClick={() => removeSite(site)} className="text-[#E8634B] hover:text-[#E8634B]/80">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {TimerUI}

      {/* Background noise toggle (placeholder) */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          onClick={() => setBackgroundNoise((b) => !b)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            backgroundNoise
              ? 'bg-[#2A6FBB]/10 text-[#2A6FBB] border-[#2A6FBB]/20'
              : 'bg-[#1A1D2E] text-[#6B7280] border-[#2A6FBB]/10 hover:text-[#F9F7F2]'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
          {backgroundNoise ? 'Noise On' : 'Noise Off'}
        </button>
      </div>
    </div>
  );
}
