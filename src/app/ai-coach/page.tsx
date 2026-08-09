import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AIInsightsCard from '@/components/AIInsightsCard';
import GoalTracker from '@/components/GoalTracker';
import MoodTracker from '@/components/MoodTracker';
import CoachChat from '@/components/CoachChat';
import BurnoutAlert from '@/components/BurnoutAlert';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'REMOTE OS — AI Coach',
  description: 'AI-powered coaching, insights, goal tracking, and mood monitoring.',
};

export default async function AICoachPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  // Fetch initial data server-side so components can render with content
  let insights: { id: string; type: string; title: string; content: string; metadata?: Record<string, unknown>; read: boolean; created_at: string }[] = [];
  let goals: { id: string; title: string; description?: string; category?: string; status: string; progress: number; deadline?: string }[] = [];
  let moods: { id: string; mood: number; energy?: number; notes?: string; created_at: string }[] = [];
  let burnout: { riskLevel: 'low' | 'medium' | 'high'; avgMood?: number; avgEnergy?: number; flags?: string[]; suggestions?: string[] } | null = null;

  try {
    const [insightsRes, goalsRes, moodsRes, burnoutRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/ai/insights`, {
        headers: { cookie: (globalThis as any).headers?.cookie ?? '' },
      }).catch(() => null),
      fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/ai/goals`, {
        headers: { cookie: (globalThis as any).headers?.cookie ?? '' },
      }).catch(() => null),
      fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/ai/mood`, {
        headers: { cookie: (globalThis as any).headers?.cookie ?? '' },
      }).catch(() => null),
      fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/ai/insights?type=burnout`, {
        headers: { cookie: (globalThis as any).headers?.cookie ?? '' },
      }).catch(() => null),
    ]);

    if (insightsRes?.ok) {
      const json = await insightsRes.json();
      insights = Array.isArray(json?.insights) ? json.insights : [];
    }
    if (goalsRes?.ok) {
      const json = await goalsRes.json();
      goals = Array.isArray(json?.goals) ? json.goals : [];
    }
    if (moodsRes?.ok) {
      const json = await moodsRes.json();
      moods = Array.isArray(json?.moods) ? json.moods : [];
    }
    if (burnoutRes?.ok) {
      const json = await burnoutRes.json();
      if (json?.burnout) burnout = json.burnout;
    }
  } catch {
    // Fail gracefully — components show empty states
  }

  return (
    <div className="flex min-h-screen bg-[#0B0D17]">
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#F9F7F2] tracking-tight">AI Coach</h1>
              <p className="text-sm text-[#6B7280] mt-1">Insights, goals, mood tracking, and real-time coaching</p>
            </div>
          </div>

          {burnout && <div className="mb-6"><BurnoutAlert data={burnout} /></div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Insights + Goals + Mood */}
            <div className="lg:col-span-2 space-y-6">
              <AIInsightsCard insights={insights} />
              <GoalTracker goals={goals} />
              <MoodTracker moods={moods} />
            </div>

            {/* Right column: Coach Chat */}
            <div className="lg:col-span-1">
              <div className="h-[600px] lg:h-[calc(100vh-8rem)]">
                <CoachChat />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
