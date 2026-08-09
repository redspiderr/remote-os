'use client';

import React, { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/analytics';

export interface TeamMetrics {
  range: string;
  members: { total: number; active: number };
  standups: { total: number; completed: number; completionRate: number; avgDuration: number };
  avgMood: number | null;
  dailyTrend: { date: string; value: number }[];
}

export default function TeamStatsCards({ teamId }: { teamId?: string }) {
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = teamId ? `?teamId=${teamId}` : '';
      const res = await fetch(`/api/admin/team-analytics${qs}`);
      if (!res.ok) throw new Error('Failed to load team metrics');
      const json = (await res.json()) as TeamMetrics;
      setMetrics(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [teamId]);

  const cards = [
    {
      label: 'Team Members',
      value: formatNumber(metrics?.members.total ?? 0),
      sub: `${formatNumber(metrics?.members.active ?? 0)} active`,
    },
    {
      label: 'Standups',
      value: formatNumber(metrics?.standups.total ?? 0),
      sub: `${metrics?.standups.completionRate ?? 0}% completed`,
    },
    {
      label: 'Avg Duration',
      value: `${Math.round((metrics?.standups.avgDuration ?? 0) / 60)}m`,
      sub: 'per standup',
    },
    {
      label: 'Avg Mood',
      value: metrics?.avgMood ? `${metrics.avgMood}/5` : '—',
      sub: 'team average',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 animate-pulse">
            <div className="h-3 w-1/3 rounded bg-[#2A6FBB]/10 mb-4" />
            <div className="h-8 w-1/2 rounded bg-[#2A6FBB]/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 transition-all hover:border-[#2A6FBB]/30"
          >
            <p className="text-xs font-medium text-[#6B7280] mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-[#F9F7F2] tracking-tight">{c.value}</p>
            {c.sub && <p className="text-xs text-[#6B7280] mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
