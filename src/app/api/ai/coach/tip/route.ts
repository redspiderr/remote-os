import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gpt4oChatCompletion } from '@/lib/openai';
import { PERSONALIZED_TIP_PROMPT } from '@/lib/ai-prompts';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const tipSchema = z.object({
  context: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = tipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
    }

    const userId = session.user.id;

    // Gather user's recent context
    const client = await db.pool.connect();
    let context = '';
    try {
      const goalsRes = await client.query(
        `SELECT title, status, progress, category FROM goals WHERE user_id = $1 AND status = 'active' ORDER BY updated_at DESC LIMIT 5`,
        [userId]
      );
      const moodRes = await client.query(
        `SELECT mood, energy, notes, created_at FROM mood_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 7`,
        [userId]
      );
      const standupsRes = await client.query(
        `SELECT summary, sentiment, created_at FROM standups WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3`,
        [userId]
      );

      const goals = goalsRes.rows.map((g) => `${g.title} (${g.progress}%)`).join('; ') || 'No active goals';
      const moods = moodRes.rows.map((m) => `Mood ${m.mood}/5, Energy ${m.energy}/5 on ${m.created_at.toISOString().slice(0,10)}`).join('; ') || 'No mood data';
      const standups = standupsRes.rows.map((s) => `Sentiment: ${s.sentiment}`).join('; ') || 'No recent standups';

      context = `Active goals: ${goals}. Recent moods: ${moods}. Recent standups: ${standups}.`;
      if (parsed.data.context) {
        context += ` Additional context: ${parsed.data.context}`;
      }
    } finally {
      client.release();
    }

    const tip = await gpt4oChatCompletion<{ tip: string; category: string; rationale: string }>(
      PERSONALIZED_TIP_PROMPT,
      context
    );

    return NextResponse.json({ tip }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Coach tip error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
