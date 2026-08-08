'use client';

import React, { useState } from 'react';
import DeepWorkGuard from '@/components/DeepWorkGuard';

export default function FocusPageClient() {
  const [zen, setZen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'focus' | 'break' | 'completed'>('idle');

  const isZen = zen || phase === 'focus';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-700 ${isZen ? 'bg-[#070810]' : 'bg-[#0B0D17]'}`}>
      {/* Zen toggle */}
      <div className="fixed top-6 right-6 z-10">
        <button
          onClick={() => setZen((z) => !z)}
          aria-label={isZen ? 'Exit zen focus mode' : 'Enter zen focus mode'}
          aria-pressed={isZen}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40 ${
            isZen
              ? 'bg-[#1A1D2E] text-[#6B7280] border-[#2A6FBB]/10'
              : 'bg-[#1A1D2E] text-[#6B7280] border-[#2A6FBB]/10 hover:text-[#F9F7F2]'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {isZen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            )}
          </svg>
          {isZen ? 'Exit Zen' : 'Zen'}
        </button>
      </div>

      {/* Branding only when not zen */}
      {!isZen && (
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#F9F7F2]">Focus Mode</h1>
          <p className="text-sm text-[#6B7280] mt-1">One task. One timer. No distractions.</p>
        </div>
      )}

      <DeepWorkGuard onPhaseChange={setPhase} />

      {!isZen && (
        <footer className="mt-12 text-center">
          <p className="text-[#6B7280] text-xs">
            REMOTE OS · Deep Work Guard · ARIA
          </p>
        </footer>
      )}
    </div>
  );
}
