'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface HeatmapData {
  heatmap: { date: string; count: number }[];
}

function getColorClass(count: number): string {
  if (count === 0) return 'bg-[#0B0D17]';
  if (count <= 2) return 'bg-[#2A6FBB]/30';
  if (count <= 5) return 'bg-[#2A6FBB]/50';
  if (count <= 8) return 'bg-[#2A6FBB]/70';
  return 'bg-[#2A6FBB]';
}

export default function ActivityHeatmap({ teamId }: { teamId?: string }) {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = teamId ? `?teamId=${teamId}` : '';
      const res = await fetch(`/api/admin/heatmap${qs}`);
      if (!res.ok) throw new Error('Failed to load heatmap');
      const json = (await res.json()) as HeatmapData;
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teamId]);

  const weeks = useMemo(() => {
    const rows: { date: string; count: number }[][] = [];
    const flat = data?.heatmap ?? [];
    if (flat.length === 0) return rows;

    const map = new Map(flat.map((d) => [d.date, d.count]));
    const start = new Date(flat[0].date);
    const end = new Date();
    const days: { date: string; count: number }[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      days.push({ date: key, count: map.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [data]);

  return (
    <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 mb-6">
      <h3 className="text-sm font-semibold text-[#F9F7F2] mb-4">Standup Activity Heatmap</h3>
      {error && (
        <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
          {error}
        </div>
      )}
      {loading ? (
        <div className="h-40 animate-pulse bg-[#0B0D17] rounded-xl" />
      ) : weeks.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-[#6B7280]">No activity data</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} standups`}
                    className={`w-4 h-4 rounded-sm ${getColorClass(day.count)} transition-colors`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-[#6B7280]">
            <span>Less</span>
            <span className="w-3 h-3 rounded-sm bg-[#0B0D17]" />
            <span className="w-3 h-3 rounded-sm bg-[#2A6FBB]/30" />
            <span className="w-3 h-3 rounded-sm bg-[#2A6FBB]/50" />
            <span className="w-3 h-3 rounded-sm bg-[#2A6FBB]/70" />
            <span className="w-3 h-3 rounded-sm bg-[#2A6FBB]" />
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  );
}
