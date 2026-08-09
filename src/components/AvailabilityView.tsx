'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface CalendarEvent {
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface AvailabilityData {
  teamId?: string;
  memberIds: string[];
  events: CalendarEvent[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0–23

function toTimeLabel(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`;
}

function getHourSlot(iso: string): number {
  return new Date(iso).getHours();
}

export default function AvailabilityView() {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/calendar/availability');
      if (!res.ok) throw new Error('Failed to load availability');
      const json = (await res.json()) as AvailabilityData;
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  const slots = useMemo(() => {
    if (!data) return [] as { hour: number; busyMembers: Set<string> }[];
    return HOURS.map((hour) => {
      const busyMembers = new Set<string>();
      data.events.forEach((ev) => {
        const start = new Date(ev.startTime);
        const end = new Date(ev.endTime);
        // Mark busy if the event overlaps this hour
        for (let h = start.getHours(); h <= end.getHours(); h++) {
          if (h === hour) {
            busyMembers.add(ev.userId);
          }
        }
      });
      return { hour, busyMembers };
    });
  }, [data]);

  const totalMembers = data?.memberIds?.length ?? 1;

  return (
    <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#F9F7F2]">Team Availability</h3>
        {loading && <span className="text-xs text-[#6B7280]">Loading…</span>}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {slots.map(({ hour, busyMembers }) => {
          const freeCount = totalMembers - busyMembers.size;
          const pct = totalMembers > 0 ? (freeCount / totalMembers) * 100 : 100;
          return (
            <div key={hour} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-xs text-[#6B7280]">{toTimeLabel(hour)}</span>
              <div className="flex-1 h-5 rounded-lg overflow-hidden bg-[#13151f]/60 border border-[#2A6FBB]/10">
                <div
                  className="h-full rounded-lg bg-green-500/60 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-16 text-right text-xs text-[#6B7280]">
                {freeCount}/{totalMembers} free
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
