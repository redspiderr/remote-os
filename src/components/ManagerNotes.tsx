'use client';

import React, { useEffect, useState } from 'react';

export interface ManagerNote {
  id: string;
  managerId: string;
  memberId: string;
  note: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ManagerNotes({ memberId }: { memberId: string }) {
  const [notes, setNotes] = useState<ManagerNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [tags, setTags] = useState('');

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/notes?memberId=${encodeURIComponent(memberId)}`);
      if (!res.ok) throw new Error('Failed to load notes');
      const json = (await res.json()) as { notes: ManagerNote[] };
      setNotes(json.notes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!draft.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5);
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, note: draft.trim(), tags: tagList }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save note');
      }
      setDraft('');
      setTags('');
      await fetchNotes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [memberId]);

  return (
    <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5">
      <h3 className="text-sm font-semibold text-[#F9F7F2] mb-4">Manager Notes</h3>
      {error && (
        <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
          {error}
        </div>
      )}
      <div className="mb-4 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a private note about this member…"
          className="w-full rounded-xl border border-[#2A6FBB]/15 bg-[#0B0D17] px-3 py-2 text-sm text-[#F9F7F2] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/30 resize-none"
          rows={3}
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags (comma separated)"
          className="w-full rounded-xl border border-[#2A6FBB]/15 bg-[#0B0D17] px-3 py-2 text-sm text-[#F9F7F2] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/30"
        />
        <button
          onClick={saveNote}
          disabled={saving || !draft.trim()}
          className="px-4 py-2 rounded-xl bg-[#2A6FBB] text-white text-xs font-medium hover:bg-[#2A6FBB]/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Add Note'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#0B0D17] rounded-lg" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-sm text-[#6B7280] text-center py-6">No notes yet</div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl border border-[#2A6FBB]/10 bg-[#0B0D17] p-3">
              <p className="text-sm text-[#F9F7F2] whitespace-pre-wrap">{n.note}</p>
              <div className="flex items-center gap-2 mt-2">
                {n.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A6FBB]/10 text-[#2A6FBB]">
                    {tag}
                  </span>
                ))}
                <span className="text-[10px] text-[#6B7280] ml-auto">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
