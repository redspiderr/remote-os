'use client';

import React, { useEffect, useState } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
}

export default function UpcomingEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      // Reuse availability endpoint for now (returns today's events)
      const res = await fetch('/api/calendar/availability');
      if (!res.ok) throw new Error('Failed to load events');
      const data = (await res.json()) as { events: { title: string; startTime: string; endTime: string }[] };
      const mapped = (data.events ?? [])
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 5)
        .map((ev, idx) => ({
          id: `${idx}-${ev.startTime}`,
          title: ev.title,
          startTime: ev.startTime,
          endTime: ev.endTime,
        }));
      setEvents(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // Refresh every 60s
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRange = (startIso: string, endIso: string) => {
    return `${formatTime(startIso)} – ${formatTime(endIso)}`;
  };

  return (
    <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#F9F7F2]">Upcoming Events</h3>
        {loading && <span className="text-xs text-[#6B7280]">Loading…</span>}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {events.length === 0 && !loading && (
          <p className="text-sm text-[#6B7280]">No upcoming events today.</p>
        )}

        {events.map((ev) => (
          <div
            key={ev.id}
            className="flex items-start gap-3 rounded-xl border border-[#2A6FBB]/10 bg-[#13151f]/60 px-4 py-3"
          >
            <div className="flex flex-col items-center justify-center rounded-lg bg-[#2A6FBB]/10 px-2 py-1">
              <span className="text-xs font-semibold text-[#2A6FBB]">
                {new Date(ev.startTime).toLocaleDateString([], { weekday: 'short' })}
              </span>
              <span className="text-sm font-bold text-[#F9F7F2]">
                {new Date(ev.startTime).getDate()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-[#F9F7F2]">{ev.title}</p>
              <p className="text-xs text-[#6B7280]">{formatRange(ev.startTime, ev.endTime)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
