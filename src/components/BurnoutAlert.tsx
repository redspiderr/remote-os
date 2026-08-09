'use client';

import React from 'react';

export interface BurnoutData {
  riskLevel: 'low' | 'medium' | 'high';
  avgMood?: number;
  avgEnergy?: number;
  flags?: string[];
  suggestions?: string[];
}

interface BurnoutAlertProps {
  data: BurnoutData | null;
  onDismiss?: () => void;
}

export default function BurnoutAlert({ data, onDismiss }: BurnoutAlertProps) {
  if (!data || data.riskLevel === 'low') return null;

  const isHigh = data.riskLevel === 'high';
  const title = isHigh ? '🔥 Burnout Risk Alert' : '⚠️ Wellness Check';
  const bgClass = isHigh
    ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200'
    : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200';

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${bgClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-base font-semibold">{title}</h3>
          {data.avgMood !== undefined && data.avgEnergy !== undefined && (
            <p className="mt-1 text-sm opacity-90">
              Recent average: Mood {data.avgMood.toFixed(1)}/5 · Energy {data.avgEnergy.toFixed(1)}/5
            </p>
          )}
          {data.flags && data.flags.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-sm opacity-90">
              {data.flags.map((flag, i) => (
                <li key={i}>{flag}</li>
              ))}
            </ul>
          )}
          {data.suggestions && data.suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Suggestions</p>
              <ul className="mt-1 list-inside list-decimal text-sm opacity-90">
                {data.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 rounded-md bg-white/60 px-2 py-1 text-xs font-medium hover:bg-white/90 dark:bg-black/20 dark:hover:bg-black/40"
            aria-label="Dismiss alert"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
