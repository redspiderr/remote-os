'use client';

import React from 'react';

export interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

interface AIInsightsCardProps {
  insights: Insight[];
  onMarkRead?: (id: string) => void;
}

export default function AIInsightsCard({ insights, onMarkRead }: AIInsightsCardProps) {
  const unread = insights.filter((i) => !i.read);
  const recent = insights.slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">🤖 AI Insights</h3>
        {unread.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-200">
            {unread.length} new
          </span>
        )}
      </div>

      <div className="space-y-3">
        {recent.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No insights yet. Keep logging standups and moods to get personalized AI coaching.</p>
        )}
        {recent.map((insight) => (
          <div
            key={insight.id}
            className={`rounded-lg border p-3 transition-opacity ${
              insight.read
                ? 'border-slate-100 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-800/50'
                : 'border-indigo-100 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-900/20'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{insight.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{insight.content}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(insight.created_at).toLocaleDateString()}</span>
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {insight.type}
                  </span>
                </div>
              </div>
              {!insight.read && onMarkRead && (
                <button
                  onClick={() => onMarkRead(insight.id)}
                  className="rounded-md bg-white px-2 py-1 text-xs font-medium text-indigo-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-indigo-300 dark:ring-slate-700"
                  aria-label="Mark as read"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
