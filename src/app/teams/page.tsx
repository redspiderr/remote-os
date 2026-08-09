'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TeamStatsCards from '@/components/TeamStatsCards';

interface Team {
  id: string;
  name: string;
  slug: string;
  inviteCode: string | null;
  ownerId: string;
  role: string;
  memberCount: number;
  createdAt: string;
}

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      router.replace('/');
      return;
    }
    fetchTeams();
  }, [status, router]);

  async function fetchTeams() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/teams');
      if (!res.ok) throw new Error('Failed to load teams');
      const json = await res.json();
      setTeams(Array.isArray(json?.teams) ? json.teams : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name || creating) return;
    try {
      setCreating(true);
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to create team');
      setNewTeamName('');
      await fetchTeams();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen bg-[#0B0D17] items-center justify-center">
        <div className="text-[#6B7280] text-sm">Loading teams…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0D17]">
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#F9F7F2] tracking-tight">Teams</h1>
              <p className="text-sm text-[#6B7280] mt-1">Your teams, memberships, and quick stats</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-[#E8634B]/20 bg-[#E8634B]/10 px-4 py-3 text-sm text-[#E8634B]">
              {error}
            </div>
          )}

          {/* Create team form */}
          <form onSubmit={createTeam} className="mb-8 flex items-center gap-3">
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="New team name"
              className="flex-1 max-w-sm rounded-xl border border-[#2A6FBB]/20 bg-[#1A1D2E] px-4 py-2.5 text-sm text-[#F9F7F2] placeholder:text-[#6B7280] focus:border-[#2A6FBB]/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={creating || !newTeamName.trim()}
              className="rounded-xl bg-[#2A6FBB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2A6FBB]/90 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating…' : 'Create Team'}
            </button>
          </form>

          {/* Team cards */}
          {teams.length === 0 && !error && (
            <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-8 text-center">
              <p className="text-sm text-[#6B7280]">You are not part of any teams yet.</p>
              <p className="text-xs text-[#6B7280] mt-1">Create one above to get started.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div
                key={team.id}
                className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 hover:border-[#2A6FBB]/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-[#F9F7F2]">{team.name}</h3>
                    <p className="text-xs text-[#6B7280] mt-0.5 capitalize">{team.role} · {team.memberCount} members</p>
                  </div>
                  {team.inviteCode && (
                    <span className="rounded-lg bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 px-2 py-1 text-[10px] font-bold text-[#2A6FBB] uppercase tracking-wide">
                      Owner
                    </span>
                  )}
                </div>
                {team.inviteCode && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#6B7280] mb-1">Invite Code</p>
                    <code className="block rounded-lg bg-[#0B0D17] border border-[#2A6FBB]/10 px-3 py-2 text-sm font-mono text-[#F9F7F2]">
                      {team.inviteCode}
                    </code>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <a
                    href={`/team?teamId=${team.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 px-3 py-2 text-xs font-medium text-[#2A6FBB] hover:bg-[#2A6FBB]/20 transition-colors"
                  >
                    View Dashboard
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Global team stats */}
          {teams.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold text-[#F9F7F2] mb-4">Overview</h2>
              <TeamStatsCards />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
