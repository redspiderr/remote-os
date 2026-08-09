'use client';

import React, { useState } from 'react';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: string;
  progress: number;
  deadline?: string;
}

interface GoalTrackerProps {
  goals: Goal[];
  onUpdateProgress?: (id: string, progress: number) => void;
  onUpdateStatus?: (id: string, status: string) => void;
}

export default function GoalTracker({ goals, onUpdateProgress, onUpdateStatus }: GoalTrackerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState(0);

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  const categoryColor: Record<string, string> = {
    productivity: 'bg-blue-500',
    wellness: 'bg-green-500',
    learning: 'bg-purple-500',
    career: 'bg-amber-500',
    default: 'bg-slate-500',
  };

  function handleEdit(goal: Goal) {
    setEditingId(goal.id);
    setEditProgress(goal.progress);
  }

  function saveProgress(goalId: string) {
    onUpdateProgress?.(goalId, editProgress);
    if (editProgress >= 100) {
      onUpdateStatus?.(goalId, 'completed');
    }
    setEditingId(null);
  }

  function renderGoalItem(goal: Goal) {
    const color = categoryColor[goal.category ?? ''] ?? categoryColor.default;
    const isCompleted = goal.status === 'completed';

    return (
      <div
        key={goal.id}
        className={`rounded-lg border p-4 transition-opacity ${
          isCompleted ? 'border-slate-100 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-800/40' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${color}`}></span>
              <p className={`text-sm font-semibold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {goal.title}
              </p>
            </div>
            {goal.description && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{goal.description}</p>
            )}
            {goal.deadline && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Due {new Date(goal.deadline).toLocaleDateString()}</p>
            )}
          </div>

          <div className="ml-4 flex items-center gap-3">
            {editingId === goal.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editProgress}
                  onChange={(e) => setEditProgress(Number(e.target.value))}
                  className="w-24"
                />
                <span className="w-8 text-right text-xs font-medium">{editProgress}%</span>
                <button
                  onClick={() => saveProgress(goal.id)}
                  className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit(goal)}
                className="flex w-28 flex-col items-end gap-1"
                aria-label="Edit goal progress"
              >
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{goal.progress}%</span>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className={`h-full rounded-full ${color} transition-all`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">🎯 Goals</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{activeGoals.length} active · {completedGoals.length} done</span>
      </div>

      <div className="space-y-3">
        {goals.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No goals yet. Add one to start tracking progress.</p>
        )}
        {activeGoals.map(renderGoalItem)}
        {completedGoals.length > 0 && (
          <>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">Completed</p>
            {completedGoals.map(renderGoalItem)}
          </>
        )}
      </div>
    </div>
  );
}
