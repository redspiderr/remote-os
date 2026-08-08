'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';

// ─── Types ──────────────────────────────────────────────────────────

export type StandupStatus = 'Recorded' | 'Transcribed' | 'Summarized';

export interface Standup {
  id: string;
  user: {
    name: string;
    avatar?: string | null;
  };
  timestamp: string;
  status: StandupStatus;
  transcript: string;
  summary: string;
  videoUrl?: string;
  durationSeconds?: number;
}

export interface TeamHealth {
  totalMembers: number;
  submittedToday: number;
  submittedThisWeek: number;
  avgDurationSeconds: number;
}

interface ApiStandup {
  id: string;
  user: {
    name: string;
    avatar?: string | null;
  };
  timestamp: string;
  status: StandupStatus;
  transcript: string;
  summary: string;
  videoUrl?: string;
  durationSeconds?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function statusColor(status: StandupStatus): string {
  switch (status) {
    case 'Recorded':
      return 'bg-[#E8634B]/10 text-[#E8634B] border-[#E8634B]/20';
    case 'Transcribed':
      return 'bg-[#2A6FBB]/10 text-[#2A6FBB] border-[#2A6FBB]/20';
    case 'Summarized':
      return 'bg-[#5A7D3F]/10 text-[#5A7D3F] border-[#5A7D3F]/20';
    default:
      return 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20';
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sub-Components ─────────────────────────────────────────────────

function Avatar({ name, src }: { name: string; src?: string | null }) {
  if (src && src.startsWith('http')) {
    return (
      <Image
        src={src}
        alt={name}
        width={40}
        height={40}
        className="rounded-full object-cover border border-[#2A6FBB]/20 shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#2A6FBB]/20 border border-[#2A6FBB]/20 flex items-center justify-center text-xs font-bold text-[#2A6FBB] shrink-0">
      {src || getInitials(name)}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div data-testid="skeleton-card" className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#2A6FBB]/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-[#2A6FBB]/10" />
          <div className="h-2 w-1/4 rounded bg-[#2A6FBB]/10" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full rounded bg-[#2A6FBB]/10" />
        <div className="h-2 w-5/6 rounded bg-[#2A6FBB]/10" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 flex items-center justify-center mb-5">
        <svg
          className="w-10 h-10 text-[#2A6FBB]/60"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[#F9F7F2] mb-1">
        No standups found
      </h3>
      <p className="text-sm text-[#6B7280] max-w-xs">
        Try adjusting your filters or search query, or be the first to record a standup today.
      </p>
    </div>
  );
}

function TeamHealthBar({ health }: { health: TeamHealth }) {
  const todayPercent = Math.round((health.submittedToday / health.totalMembers) * 100);
  const weekPercent = Math.round((health.submittedThisWeek / health.totalMembers) * 100);

  return (
    <div className="rounded-2xl border border-[#2A6FBB]/15 bg-[#1A1D2E] p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#F9F7F2]">Team Health</h3>
        <span className="text-xs text-[#6B7280]">
          {health.submittedToday}/{health.totalMembers} today
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">Today</span>
            <span className="font-medium text-[#F9F7F2]">{todayPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#0B0D17]">
            <div
              className="h-2 rounded-full bg-[#5A7D3F] transition-all"
              style={{ width: `${todayPercent}%` }}
            />
          </div>
        </div>

        {/* This Week */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">This Week</span>
            <span className="font-medium text-[#F9F7F2]">{weekPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#0B0D17]">
            <div
              className="h-2 rounded-full bg-[#2A6FBB] transition-all"
              style={{ width: `${weekPercent}%` }}
            />
          </div>
        </div>

        {/* Avg Duration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">Avg Duration</span>
            <span className="font-medium text-[#F9F7F2]">
              {formatDuration(health.avgDurationSeconds)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#0B0D17]">
            <div
              className="h-2 rounded-full bg-[#E8634B] transition-all"
              style={{ width: `${Math.min(100, (health.avgDurationSeconds / 90) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StandupCard({ standup, onPlay }: { standup: Standup; onPlay?: (s: Standup) => void }) {
  const transcriptPreview = standup.transcript
    .split('\n')
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
    .slice(0, 140);

  return (
    <div className="group rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 transition-all hover:border-[#2A6FBB]/30 hover:shadow-lg hover:shadow-[#2A6FBB]/5 hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={standup.user.name} src={standup.user.avatar} />
          <div>
            <p className="text-sm font-semibold text-[#F9F7F2]">{standup.user.name}</p>
            <p className="text-xs text-[#6B7280]">{formatTime(standup.timestamp)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor(standup.status)}`}
          >
            {standup.status}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="mb-4">
        {transcriptPreview ? (
          <p className="text-sm text-[#F9F7F2]/80 leading-relaxed line-clamp-2">
            {transcriptPreview}
            {standup.transcript.length > 140 && '…'}
          </p>
        ) : (
          <p className="text-sm text-[#6B7280] italic">Transcript processing…</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {standup.status === 'Summarized' && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#5A7D3F]/10 text-[#5A7D3F] text-[10px] font-semibold border border-[#5A7D3F]/20">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              AI Summary
            </span>
          )}
          {standup.durationSeconds !== undefined && (
            <span className="text-[10px] text-[#6B7280]">
              {formatDuration(standup.durationSeconds)}
            </span>
          )}
        </div>

        {standup.videoUrl && (
          <button
            onClick={() => onPlay?.(standup)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A6FBB]/10 text-[#2A6FBB] text-xs font-medium hover:bg-[#2A6FBB]/20 transition-colors border border-[#2A6FBB]/15"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Play
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export interface StandupDashboardProps {
  standups?: Standup[];
  health?: TeamHealth;
  loading?: boolean;
  onPlayVideo?: (standup: Standup) => void;
}

export default function StandupDashboard({
  standups: propStandups,
  health: propHealth,
  loading: propLoading = false,
  onPlayVideo,
}: StandupDashboardProps) {
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');
  const [search, setSearch] = useState('');
  const [activeVideo, setActiveVideo] = useState<Standup | null>(null);

  const [data, setData] = useState<Standup[]>(propStandups ?? []);
  const [health, setHealth] = useState<TeamHealth | null>(propHealth ?? null);
  const [loading, setLoading] = useState<boolean>(propLoading);
  const [error, setError] = useState<string | null>(null);

  const fetchStandups = useCallback(async () => {
    if (propStandups) return; // external data takes precedence
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/standups');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load standups (${res.status})`);
      }
      const json = (await res.json()) as { standups: ApiStandup[] };
      setData(json.standups ?? []);

      // Derive team health from fetched data
      const todayCount = (json.standups ?? []).filter((s) => isToday(s.timestamp)).length;
      const weekCount = (json.standups ?? []).filter((s) => isThisWeek(s.timestamp)).length;
      const durations = (json.standups ?? [])
        .filter((s) => typeof s.durationSeconds === 'number')
        .map((s) => s.durationSeconds as number);
      const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      setHealth({
        totalMembers: Math.max(1, todayCount + 2), // heuristic fallback
        submittedToday: todayCount,
        submittedThisWeek: weekCount,
        avgDurationSeconds: avgDuration,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Dashboard fetch error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [propStandups]);

  useEffect(() => {
    fetchStandups();
  }, [fetchStandups]);

  const standups = propStandups ?? data;
  const teamHealth = propHealth ?? health ?? {
    totalMembers: 1,
    submittedToday: 0,
    submittedThisWeek: 0,
    avgDurationSeconds: 0,
  };

  const filtered = useMemo(() => {
    let list = standups;

    if (filter === 'today') {
      list = list.filter((s) => isToday(s.timestamp));
    } else if (filter === 'week') {
      list = list.filter((s) => isThisWeek(s.timestamp));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.user.name.toLowerCase().includes(q) ||
          s.transcript.toLowerCase().includes(q) ||
          s.summary.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }, [standups, filter, search]);

  const handlePlay = (s: Standup) => {
    if (onPlayVideo) {
      onPlayVideo(s);
    } else {
      setActiveVideo(s);
    }
  };

  return (
    <div className="w-full">
      {/* Manager Health Bar */}
      <TeamHealthBar health={teamHealth} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        {/* Filters */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/10 shrink-0">
          {(
            [
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'all', label: 'All' },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-label={`Filter by ${f.label}`}
              aria-pressed={filter === f.key}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40 ${
                filter === f.key
                  ? 'bg-[#2A6FBB] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#F9F7F2]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, transcript, or summary…"
            aria-label="Search standups"
            aria-describedby="search-help"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/10 text-sm text-[#F9F7F2] placeholder:text-[#6B7280] focus:outline-none focus:border-[#2A6FBB]/40 focus:ring-1 focus:ring-[#2A6FBB]/20 transition-all"
          />
          <p id="search-help" className="sr-only">Type to filter standups by contributor name, transcript content, or AI summary.</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchStandups} className="underline font-medium hover:text-white">Retry</button>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#6B7280]">
          Showing <span className="text-[#F9F7F2] font-medium">{filtered.length}</span>{' '}
          standup{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <StandupCard key={s.id} standup={s} onPlay={handlePlay} />
          ))}
        </div>
      )}

      {/* Inline video modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-[#1A1D2E] border border-[#2A6FBB]/20 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A6FBB]/10">
              <div className="flex items-center gap-3">
                <Avatar name={activeVideo.user.name} src={activeVideo.user.avatar} />
                <div>
                  <p className="text-sm font-semibold text-[#F9F7F2]">{activeVideo.user.name}</p>
                  <p className="text-xs text-[#6B7280]">{formatTime(activeVideo.timestamp)}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                aria-label="Close video modal"
                className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#F9F7F2] hover:bg-[#2A6FBB]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-black">
              {activeVideo.videoUrl ? (
                <video
                  src={activeVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#6B7280]">
                  <p className="text-sm">Video not available</p>
                </div>
              )}
            </div>
            {activeVideo.summary && (
              <div className="px-5 py-4 border-t border-[#2A6FBB]/10">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#5A7D3F]/10 text-[#5A7D3F] text-[10px] font-semibold border border-[#5A7D3F]/20 mb-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                  AI Summary
                </span>
                <p className="text-sm text-[#F9F7F2]/90 leading-relaxed">{activeVideo.summary}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
