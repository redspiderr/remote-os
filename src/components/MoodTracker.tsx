'use client';

import React, { useState } from 'react';

export interface MoodLog {
  id: string;
  mood: number;
  energy?: number;
  notes?: string;
  created_at: string;
}

interface MoodTrackerProps {
  moods: MoodLog[];
  onLogMood?: (data: { mood: number; energy: number; notes?: string }) => void;
}

const moodLabels = ['Very sad', 'Sad', 'Neutral', 'Happy', 'Very happy'];
const energyLabels = ['Exhausted', 'Low', 'Okay', 'Good', 'Energized'];

export default function MoodTracker({ moods, onLogMood }: MoodTrackerProps) {
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const latestMoods = moods.slice(0, 7);
  const avgMood = latestMoods.length > 0
    ? latestMoods.reduce((sum, m) => sum + m.mood, 0) / latestMoods.length
    : 0;

  function handleSubmit() {
    onLogMood?.({ mood, energy, notes: notes.trim() || undefined });
    setSubmitted(true);
    setNotes('');
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">🧠 Mood Check-in</h3>
        {avgMood > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">7-day avg: {avgMood.toFixed(1)} / 5</span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">How do you feel?</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setMood(val)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  mood === val
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {moodLabels[val - 1]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Energy level</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setEnergy(val)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  energy === val
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {energyLabels[val - 1]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            placeholder="Anything on your mind?"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitted}
          className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
            submitted
              ? 'bg-emerald-600'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {submitted ? '✅ Logged!' : 'Log Mood'}
        </button>
      </div>
    </div>
  );
}
