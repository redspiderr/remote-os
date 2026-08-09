'use client';

import React, { useState } from 'react';

interface ScheduleModalProps {
  onClose: () => void;
}

export default function ScheduleModal({ onClose }: ScheduleModalProps) {
  const [title, setTitle] = useState('Standup');
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const startTime = new Date(`${date}T${time}`).toISOString();
      const res = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, startTime, duration }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || `Schedule failed (${res.status})`);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#2A6FBB]/20 bg-[#1A1D2E] p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-[#F9F7F2] mb-4">Schedule Standup</h3>

        {success && (
          <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            Standup scheduled successfully.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[#2A6FBB]/15 bg-[#13151f]/60 px-3 py-2 text-sm text-[#F9F7F2] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40"
              placeholder="Standup"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-xl border border-[#2A6FBB]/15 bg-[#13151f]/60 px-3 py-2 text-sm text-[#F9F7F2] focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full rounded-xl border border-[#2A6FBB]/15 bg-[#13151f]/60 px-3 py-2 text-sm text-[#F9F7F2] focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Duration</label>
            <div className="flex gap-2">
              {[15, 30, 60].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDuration(min as 15 | 30 | 60)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                    duration === min
                      ? 'border-[#2A6FBB]/40 bg-[#2A6FBB]/10 text-[#F9F7F2]'
                      : 'border-[#2A6FBB]/10 text-[#6B7280] hover:text-[#F9F7F2]'
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#2A6FBB]/10 px-4 py-2.5 text-sm text-[#6B7280] hover:text-[#F9F7F2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 rounded-xl bg-[#2A6FBB] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2A6FBB]/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
