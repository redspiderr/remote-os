import React from 'react';

export default function SkeletonCard() {
  return (
    <div data-testid="skeleton-card" className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#2A6FBB]/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-[#2A6FBB]/10" />
          <div className="h-2 w-1/4 rounded bg-[#2A6FBB]/10" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full rounded bg-[#2A6FBB]/10" />
        <div className="h-2 w-5/6 rounded bg-[#2A6FBB]/10" />
      </div>
    </div>
  );
}
