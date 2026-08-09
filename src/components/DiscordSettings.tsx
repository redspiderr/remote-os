'use client';

import React, { useEffect, useState } from 'react';

interface DiscordSettingsProps {
  onClose: () => void;
  onSaved: (connected: boolean) => void;
}

export default function DiscordSettings({ onClose, onSaved }: DiscordSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [username, setUsername] = useState('REMOTE OS');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/integrations/discord/connect');
        if (!res.ok) return;
        const data = (await res.json()) as {
          connected?: boolean;
          settings?: Record<string, unknown>;
        };
        if (data.connected) {
          setExisting(true);
          const s = data.settings || {};
          if (typeof s.webhookUrl === 'string') setWebhookUrl(s.webhookUrl);
          if (typeof s.username === 'string') setUsername(s.username);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      const res = await fetch('/api/integrations/discord/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl, username }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: unknown };
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : `Save failed (${res.status})`);
      setSuccess(true);
      setTimeout(() => onSaved(true), 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestStatus(null);
      setError(null);
      const res = await fetch('/api/integrations/discord/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'REMOTE OS webhook test message.' }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || `Test failed (${res.status})`);
      setTestStatus('Webhook posted successfully!');
    } catch (e: unknown) {
      setTestStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#2A6FBB]/20 bg-[#1A1D2E] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#F9F7F2]">Discord Settings</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-[#6B7280] hover:text-[#F9F7F2] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success && (
          <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            Discord connected successfully.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
            {error}
          </div>
        )}

        {testStatus && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${testStatus.includes('successfully') ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-[#E8634B]/20 bg-[#E8634B]/10 text-[#E8634B]'}`}>
            {testStatus}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full rounded-xl border border-[#2A6FBB]/15 bg-[#13151f]/60 px-3 py-2 text-sm text-[#F9F7F2] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1">Username (optional)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="REMOTE OS"
              className="w-full rounded-xl border border-[#2A6FBB]/15 bg-[#13151f]/60 px-3 py-2 text-sm text-[#F9F7F2] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40"
            />
          </div>

          {existing && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-400">
              Existing connection found. Saving will overwrite settings.
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || loading}
              className="flex-1 rounded-xl border border-[#2A6FBB]/20 px-4 py-2.5 text-sm font-medium text-[#F9F7F2] hover:bg-[#2A6FBB]/10 disabled:opacity-50 transition-colors"
            >
              {testing ? 'Testing…' : 'Test Webhook'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || testing || !webhookUrl}
              className="flex-1 rounded-xl bg-[#2A6FBB] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2A6FBB]/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
