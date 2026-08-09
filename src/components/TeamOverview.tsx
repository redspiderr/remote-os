'use client';

import React, { useEffect, useState } from 'react';
import TeamStatsCards from './TeamStatsCards';
import EngagementChart from './EngagementChart';
import ActivityHeatmap from './ActivityHeatmap';
import LeaderboardTable from './LeaderboardTable';
import ExportModal from './ExportModal';
import ManagerNotes from './ManagerNotes';

export default function TeamOverview({ teamId }: { teamId?: string }) {
  const [showExport, setShowExport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members'>('overview');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Load members for notes dropdown (use engagement endpoint for names)
    fetch(`/api/admin/engagement${teamId ? `?teamId=${teamId}` : ''}`)
      .then((r) => r.json())
      .then((json) => {
        const list = (json?.engagement ?? []).map((m: any) => ({ id: m.id, name: m.name }));
        setMembers(list);
      })
      .catch(() => {});
  }, [teamId]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F9F7F2] tracking-tight">Team Dashboard</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manager view · participation, engagement, and private notes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 text-[#2A6FBB] text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2A6FBB]" />
            MANAGER
          </div>
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-2 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/15 text-xs text-[#F9F7F2] hover:border-[#2A6FBB]/40 transition-all"
          >
            Export Report
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-[#2A6FBB]/10">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
            activeTab === 'overview'
              ? 'border-[#2A6FBB] text-[#F9F7F2]'
              : 'border-transparent text-[#6B7280] hover:text-[#F9F7F2]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
            activeTab === 'members'
              ? 'border-[#2A6FBB] text-[#F9F7F2]'
              : 'border-transparent text-[#6B7280] hover:text-[#F9F7F2]'
          }`}
        >
          Member Notes
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <TeamStatsCards teamId={teamId} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <EngagementChart teamId={teamId} />
            </div>
            <div className="lg:col-span-2">
              <ActivityHeatmap teamId={teamId} />
            </div>
            <div className="lg:col-span-2">
              <LeaderboardTable teamId={teamId} />
            </div>
          </div>
        </>
      )}

      {activeTab === 'members' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5">
              <h3 className="text-sm font-semibold text-[#F9F7F2] mb-3">Members</h3>
              <div className="space-y-1">
                {members.length === 0 && (
                  <p className="text-sm text-[#6B7280]">No members found</p>
                )}
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                      selectedMemberId === m.id
                        ? 'bg-[#2A6FBB]/15 text-[#F9F7F2] border border-[#2A6FBB]/20'
                        : 'text-[#6B7280] hover:text-[#F9F7F2] hover:bg-[#0B0D17]'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            {selectedMemberId ? (
              <ManagerNotes memberId={selectedMemberId} />
            ) : (
              <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 h-full flex items-center justify-center text-sm text-[#6B7280]">
                Select a member to view notes
              </div>
            )}
          </div>
        </div>
      )}

      {showExport && <ExportModal teamId={teamId} onClose={() => setShowExport(false)} />}
    </div>
  );
}
