'use client';

import React from 'react';

function shimmerClass(width?: string | number, height?: string | number, rounded?: string) {
  return (
    'skeleton-shimmer bg-[#2A6FBB]/10 ' +
    (rounded ? rounded : 'rounded') +
    (width ? ` w-[${typeof width === 'number' ? `${width}px` : width}]` : ' w-full') +
    (height ? ` h-[${typeof height === 'number' ? `${height}px` : height}]` : ' h-3')
  );
}

// ─── SkeletonCard ──────────────────────────────────────────────────
export function SkeletonCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-testid="skeleton-card"
          className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full skeleton-shimmer bg-[#2A6FBB]/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded skeleton-shimmer bg-[#2A6FBB]/10" />
              <div className="h-2 w-1/4 rounded skeleton-shimmer bg-[#2A6FBB]/10" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full rounded skeleton-shimmer bg-[#2A6FBB]/10" />
            <div className="h-2 w-5/6 rounded skeleton-shimmer bg-[#2A6FBB]/10" />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── SkeletonButton ────────────────────────────────────────────────
export function SkeletonButton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-testid="skeleton-button"
          className="h-10 w-32 rounded-lg skeleton-shimmer bg-[#2A6FBB]/10"
        />
      ))}
    </>
  );
}

// ─── SkeletonTextBlock ─────────────────────────────────────────────
export function SkeletonTextBlock({ lines = 3 }: { lines?: number }) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3', 'w-full'];
  return (
    <div data-testid="skeleton-text-block" className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded skeleton-shimmer bg-[#2A6FBB]/10 ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  );
}

// ─── SkeletonAvatar ────────────────────────────────────────────────
export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      data-testid="skeleton-avatar"
      className="rounded-full skeleton-shimmer bg-[#2A6FBB]/10"
      style={{ width: size, height: size }}
    />
  );
}

// ─── SkeletonPage ────────────────────────────────────────────────────
export function SkeletonPage() {
  return (
    <div data-testid="skeleton-page" className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg skeleton-shimmer bg-[#2A6FBB]/10" />
        <SkeletonButton />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard count={3} />
      </div>
    </div>
  );
}

// ─── SkeletonVideoPlayer ─────────────────────────────────────────────
export function SkeletonVideoPlayer() {
  return (
    <div
      data-testid="skeleton-video-player"
      className="aspect-video w-full rounded-2xl skeleton-shimmer bg-[#2A6FBB]/10"
    />
  );
}

// ─── SkeletonTableRow ────────────────────────────────────────────────
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <div data-testid="skeleton-table-row" className="flex items-center gap-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className={`h-3 rounded skeleton-shimmer bg-[#2A6FBB]/10 ${
            i === 0 ? 'w-8' : 'flex-1'
          }`}
        />
      ))}
    </div>
  );
}
