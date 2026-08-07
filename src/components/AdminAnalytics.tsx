'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { formatDuration, formatNumber } from '@/lib/analytics';

// ─── Types ──────────────────────────────────────────────────────────

export interface AdminStats {
  range: string;
  users: {
    total: number;
    active: number;
    newSignupsThisWeek: number;
  };
  standups: {
    total: number;
    period: number;
    completed: number;
    completionRate: number;
    avgDuration: number;
  };
  charts: {
    dailyTrend: { date: string; value: number }[];
    statusDistribution: { name: string; value: number }[];
  };
  leaderboard: {
    id: string;
    name: string;
    avatar: string | null;
    standups: number;
    avgDuration: number;
    lastStandup: string | null;
  }[];
  revenue: {
    total: number;
    mrr: number;
    arpu: number;
    trials: number;
    paidUsers: number;
  };
}

// ─── Colors ─────────────────────────────────────────────────────────

const COLORS = {
  primary: '#2A6FBB',
  success: '#5A7D3F',
  danger: '#E8634B',
  warning: '#D4A843',
  slate: '#6B7280',
  surface: '#1A1D2E',
  bg: '#0B0D17',
  chartPalette: ['#2A6FBB', '#5A7D3F', '#E8634B', '#D4A843', '#6B7280'],
};

// ─── Sub-Components ─────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 animate-pulse">
      <div className="h-3 w-1/3 rounded bg-[#2A6FBB]/10 mb-4" />
      <div className="h-8 w-1/2 rounded bg-[#2A6FBB]/10" />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'primary' | 'success' | 'danger' | 'warning';
}) {
  const accentMap = {
    primary: 'border-[#2A6FBB]/30',
    success: 'border-[#5A7D3F]/30',
    danger: 'border-[#E8634B]/30',
    warning: 'border-[#D4A843]/30',
  };
  return (
    <div
      className={`rounded-2xl border ${
        accent ? accentMap[accent] : 'border-[#2A6FBB]/10'
      } bg-[#1A1D2E] p-5 transition-all hover:border-[#2A6FBB]/30`}
    >
      <p className="text-xs font-medium text-[#6B7280] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#F9F7F2] tracking-tight">{value}</p>
      {sub && <p className="text-xs text-[#6B7280] mt-1">{sub}</p>}
    </div>
  );
}

function LeaderboardRow({
  rank,
  user,
}: {
  rank: number;
  user: AdminStats['leaderboard'][number];
}) {
  const medal =
    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#2A6FBB]/10 last:border-0">
      <span className="w-8 text-center text-sm font-bold text-[#6B7280]">{medal}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#F9F7F2] truncate">{user.name}</p>
        <p className="text-xs text-[#6B7280]">
          {user.standups} standup{user.standups !== 1 ? 's' : ''} · avg{' '}
          {formatDuration(user.avgDuration)}
        </p>
      </div>
      <div className="shrink-0">
        <div className="h-1.5 w-24 rounded-full bg-[#0B0D17]">
          <div
            className="h-1.5 rounded-full bg-[#5A7D3F]"
            style={{ width: `${Math.min(100, user.standups * 10)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CSSBarChart({ data }: { data: { date: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 h-full px-2 pb-1">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="w-full relative flex items-end" style={{ height: '160px' }}>
              <div
                className="w-full rounded-t-md bg-[#2A6FBB]/80 hover:bg-[#2A6FBB] transition-colors"
                style={{ height: `${pct}%` }}
                title={`${d.date}: ${d.value}`}
              />
            </div>
            <span className="text-[10px] text-[#6B7280] truncate w-full text-center">
              {d.date.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SVGPieChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[#6B7280]">
        No data
      </div>
    );
  }
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const frac = d.value / total;
    const sweep = frac * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { name: d.name, value: d.value, path, color: COLORS.chartPalette[i % COLORS.chartPalette.length], pct: Math.round(frac * 100) };
  });
  return (
    <div className="flex flex-col items-center h-full justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#1A1D2E" strokeWidth={2}>
            <title>{`${s.name}: ${s.value} (${s.pct}%)`}</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={r * 0.45} fill="#1A1D2E" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#F9F7F2" fontSize={14} fontWeight={700}>
          {total}
        </text>
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-[#6B7280]">{s.name} ({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export default function AdminAnalytics() {
  const [range, setRange] = useState('week');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (r: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/stats?range=${r}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load stats (${res.status})`);
      }
      const json = (await res.json()) as AdminStats;
      setStats(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(range);
  }, [range]);

  const dailyData = useMemo(() => stats?.charts.dailyTrend ?? [], [stats]);
  const statusData = useMemo(() => stats?.charts.statusDistribution ?? [], [stats]);

  const totalRevenue = stats?.revenue.total ?? 0;
  const mrr = stats?.revenue.mrr ?? 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#F9F7F2] tracking-tight">Admin Analytics</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {stats?.range ?? '—'} · Finance & Analytics Dashboard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8634B]/10 border border-[#E8634B]/20 text-[#E8634B] text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8634B]" />
            ADMIN
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/10">
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'Week' },
              { key: 'month', label: 'Month' },
              { key: 'last7', label: '7D' },
              { key: 'last30', label: '30D' },
              { key: 'all', label: 'All' },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  range === r.key
                    ? 'bg-[#2A6FBB] text-white shadow-sm'
                    : 'text-[#6B7280] hover:text-[#F9F7F2]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchStats(range)} className="underline font-medium hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Total Users"
            value={formatNumber(stats?.users.total ?? 0)}
            sub={`${formatNumber(stats?.users.newSignupsThisWeek ?? 0)} new this week`}
            accent="primary"
          />
          <StatCard
            label="Active Users"
            value={formatNumber(stats?.users.active ?? 0)}
            sub={`${stats?.users.total ? Math.round(((stats?.users.active ?? 0) / stats.users.total) * 100) : 0}% of total`}
            accent="success"
          />
          <StatCard
            label="Standups"
            value={formatNumber(stats?.standups.period ?? 0)}
            sub={`${formatNumber(stats?.standups.total ?? 0)} all time`}
            accent="warning"
          />
          <StatCard
            label="Completion Rate"
            value={`${stats?.standups.completionRate ?? 0}%`}
            sub={`${formatNumber(stats?.standups.completed ?? 0)} completed`}
            accent="success"
          />
          <StatCard
            label="Avg Duration"
            value={formatDuration(stats?.standups.avgDuration ?? 0)}
            sub="per standup"
            accent="primary"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Trend */}
        <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5">
          <h3 className="text-sm font-semibold text-[#F9F7F2] mb-4">Daily Standups</h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="h-32 w-full bg-[#2A6FBB]/10 animate-pulse rounded-lg" />
              </div>
            ) : (
              <CSSBarChart data={dailyData} />
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5">
          <h3 className="text-sm font-semibold text-[#F9F7F2] mb-4">Status Distribution</h3>
          <div className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="h-32 w-32 bg-[#2A6FBB]/10 animate-pulse rounded-full" />
              </div>
            ) : (
              <SVGPieChart data={statusData} />
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#F9F7F2]">Team Participation</h3>
            <span className="text-xs text-[#6B7280]">{stats?.leaderboard.length ?? 0} members</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-[#2A6FBB]/10 animate-pulse" />
              ))}
            </div>
          ) : stats?.leaderboard.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-8 text-center">No participation data for this period.</p>
          ) : (
            <div>
              {stats?.leaderboard.map((u, i) => (
                <LeaderboardRow key={u.id} rank={i + 1} user={u} />
              ))}
            </div>
          )}
        </div>

        {/* Revenue Panel */}
        <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-[#F9F7F2]">Revenue</h3>
            <span className="text-[10px] font-bold text-[#D4A843] border border-[#D4A843]/20 bg-[#D4A843]/10 px-1.5 py-0.5 rounded">
              COMING SOON
            </span>
          </div>
          <div className="space-y-4">
            <StatCard label="Total Revenue" value={`$${formatNumber(totalRevenue)}`} />
            <StatCard label="MRR" value={`$${formatNumber(mrr)}`} />
            <StatCard
              label="ARPU"
              value={`$${stats?.revenue.arpu ?? 0}`}
              sub="Average revenue per user"
            />
            <StatCard
              label="Paid Users"
              value={formatNumber(stats?.revenue.paidUsers ?? 0)}
              sub={`${formatNumber(stats?.revenue.trials ?? 0)} on trial`}
            />
          </div>
          <p className="text-xs text-[#6B7280] mt-4 leading-relaxed">
            Revenue tracking is ready for Stripe integration. Set STRIPE_SECRET_KEY and
            billing_webhook to activate monetization metrics.
          </p>
        </div>
      </div>
    </div>
  );
}
