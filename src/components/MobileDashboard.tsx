'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Standup } from './StandupDashboard';

interface MobileDashboardProps {
  standups: Standup[];
  onPlay?: (standup: Standup) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MobileDashboard({ standups, onPlay }: MobileDashboardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, standups.length - 1));
  }, [standups.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(e.targetTouches[0].clientX);
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    const diff = touchStart - touchEnd;
    const threshold = 50;
    if (diff > threshold) {
      handleNext();
    } else if (diff < -threshold) {
      handlePrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNext, handlePrev]);

  const current = standups[currentIndex];

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#2A6FBB]/60" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-[#F9F7F2] mb-1">No standups</h3>
        <p className="text-xs text-[#6B7280] max-w-xs">Be the first to record a standup today.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden md:hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Card stack */}
      <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {standups.map((standup) => (
          <div key={standup.id} className="w-full flex-shrink-0 px-2">
            <div className="rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5 shadow-lg shadow-black/20">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2A6FBB]/20 border border-[#2A6FBB]/20 flex items-center justify-center text-xs font-bold text-[#2A6FBB] shrink-0">
                    {getInitials(standup.user.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#F9F7F2]">{standup.user.name}</p>
                    <p className="text-xs text-[#6B7280]">{formatTime(standup.timestamp)}</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-[#2A6FBB]/10 text-[#2A6FBB] border-[#2A6FBB]/20">
                  {standup.status}
                </span>
              </div>

              {/* Body */}
              <div className="mb-4">
                <p className="text-sm text-[#F9F7F2]/80 leading-relaxed line-clamp-3">
                  {standup.transcript || 'Transcript processing…'}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                {standup.durationSeconds !== undefined && (
                  <span className="text-[10px] text-[#6B7280]">
                    {Math.floor(standup.durationSeconds / 60)}:{(standup.durationSeconds % 60).toString().padStart(2, '0')}
                  </span>
                )}
                {standup.videoUrl && (
                  <button
                    onClick={() => onPlay?.(standup)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A6FBB]/10 text-[#2A6FBB] text-xs font-medium hover:bg-[#2A6FBB]/20 transition-colors border border-[#2A6FBB]/15"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    Play
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      {standups.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {standups.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Go to card ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-[#2A6FBB]' : 'bg-[#2A6FBB]/25'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
