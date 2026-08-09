'use client';

import React, { useEffect, useState } from 'react';

interface CalendarIntegration {
  provider: string;
  connectedAt: string | null;
  expiresAt: string | null;
}

export default function CalendarSettings() {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/calendar/status');
      if (!res.ok) throw new Error('Failed to load calendar status');
      const data = (await res.json()) as { integrations: CalendarIntegration[] };
      setIntegrations(data.integrations ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = async (provider: 'google' | 'outlook') => {
    try {
      setBusyProvider(provider);
      setError(null);
      const res = await fetch('/api/calendar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || `Connect failed (${res.status})`);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyProvider(null);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'outlook') => {
    try {
      setBusyProvider(provider);
      setError(null);
      const res = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || `Disconnect failed (${res.status})`);
      await fetchStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyProvider(null);
    }
  };

  const isConnected = (provider: string) =>
    integrations.some((i) => i.provider === provider);

  const connectedAt = (provider: string) => {
    const i = integrations.find((x) => x.provider === provider);
    return i?.connectedAt ? new Date(i.connectedAt).toLocaleDateString() : null;
  };

  return (
    <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#F9F7F2]">Connected Calendars</h3>
        {loading && <span className="text-xs text-[#6B7280]">Loading…</span>}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {(['google', 'outlook'] as const).map((provider) => {
          const connected = isConnected(provider);
          return (
            <div
              key={provider}
              className="flex items-center justify-between rounded-xl border border-[#2A6FBB]/10 bg-[#13151f]/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-[#6B7280]'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-[#F9F7F2]">
                    {provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'}
                  </p>
                  {connected && connectedAt(provider) && (
                    <p className="text-xs text-[#6B7280]">
                      Connected on {connectedAt(provider)}
                    </p>
                  )}
                </div>
              </div>

              {connected ? (
                <button
                  onClick={() => handleDisconnect(provider)}
                  disabled={busyProvider === provider}
                  className="rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-3 py-1.5 text-xs font-medium text-[#E8634B] hover:bg-[#E8634B]/20 disabled:opacity-50 transition-colors"
                >
                  {busyProvider === provider ? 'Disconnecting…' : 'Disconnect'}
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(provider)}
                  disabled={busyProvider === provider}
                  className="rounded-xl bg-[#2A6FBB] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2A6FBB]/90 disabled:opacity-50 transition-colors"
                >
                  {busyProvider === provider ? 'Connecting…' : 'Connect'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
