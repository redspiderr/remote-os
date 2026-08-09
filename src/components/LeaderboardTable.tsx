'use client';

import React, { useEffect, useState } from 'react';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatar: string | null;
  standups: number;
  avgDuration: number;
  lastStandup: string | null;
  streakDays: number;
}

export default function LeaderboardTable({ teamId }: { teamId?: string }) {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = teamId ? `?teamId=${teamId}` : '';
      const res = await fetch(`/api/admin/leaderboard${qs}`);
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const json = (await res.json()) as { leaderboard: LeaderboardEntry[] };
      setRows(json.leaderboard);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teamId]);

  const medal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#F9F7F2]">Leaderboard</h3>
        <button
          onClick={fetchData}
          className="text-xs text-[#6B7280] hover:text-[#F9F7F2] transition-colors"
        >
          Refresh
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
          {error}
        </div>
      )}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-[#0B0D17] rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-[#6B7280] text-center py-8">No leaderboard data</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#6B7280] border-b border-[#2A6FBB]/10">
                <th className="pb-2 font-medium w-12">Rank</th>
                <th className="pb-2 font-medium">Member</th>
                <th className="pb-2 font-medium text-right">Standups</th>
                <th className="pb-2 font-medium text-right">Streak</th>
                <th className="pb-2 font-medium text-right">Avg Duration</th>
              </tr>
            </thead>
            <tbody className="text-[#F9F7F2]">
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#2A6FBB]/5 last:border-0">
                  <td className="py-3 text-xs font-bold text-[#6B7280]">{medal(r.rank)}</td>
                  <td className="py-3">{r.name}</td>
                  <td className="py-3 text-right">{r.standups}</td>
                  <td className="py-3 text-right">{r.streakDays}d</td>
                  <td className="py-3 text-right text-[#6B7280]">{Math.round(r.avgDuration / 60)}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
