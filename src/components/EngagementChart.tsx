'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export interface EngagementData {
  range: string;
  engagement: {
    id: string;
    name: string;
    avatar: string | null;
    standups: number;
    avgDuration: number;
    lastStandup: string | null;
    participationRate: number;
  }[];
}

export default function EngagementChart({ teamId }: { teamId?: string }) {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = teamId ? `?teamId=${teamId}` : '';
      const res = await fetch(`/api/admin/engagement${qs}`);
      if (!res.ok) throw new Error('Failed to load engagement');
      const json = (await res.json()) as EngagementData;
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

  const chartData = useMemo(() => {
    return (data?.engagement ?? []).map((d) => ({
      name: d.name.split(' ')[0] ?? d.name,
      standups: d.standups,
      participation: d.participationRate,
    }));
  }, [data]);

  return (
    <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#F9F7F2]">Member Engagement</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChartType('bar')}
            className={`px-2 py-1 rounded text-xs ${chartType === 'bar' ? 'bg-[#2A6FBB] text-white' : 'text-[#6B7280]'}`}
          >
            Bar
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-2 py-1 rounded text-xs ${chartType === 'line' ? 'bg-[#2A6FBB] text-white' : 'text-[#6B7280]'}`}
          >
            Line
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 animate-pulse bg-[#0B0D17] rounded-xl" />
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-[#6B7280]">No engagement data</div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A6FBB10" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1D2E', border: '1px solid #2A6FBB20', borderRadius: '8px' }}
                  itemStyle={{ color: '#F9F7F2' }}
                />
                <Bar dataKey="standups" fill="#2A6FBB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="participation" fill="#5A7D3F" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A6FBB10" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1D2E', border: '1px solid #2A6FBB20', borderRadius: '8px' }}
                  itemStyle={{ color: '#F9F7F2' }}
                />
                <Line type="monotone" dataKey="standups" stroke="#2A6FBB" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="participation" stroke="#5A7D3F" strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
