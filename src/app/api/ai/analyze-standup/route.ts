import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { gpt4oChatCompletion } from '@/lib/openai';
import { STANDUP_IMPROVEMENT_PROMPT } from '@/lib/ai-prompts';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { standup_id } = body as { standup_id?: string };
    if (!standup_id) {
      return NextResponse.json({ error: 'Missing standup_id' }, { status: 400 });
    }

    const client = await db.pool.connect();
    let transcript = '';
    let summary = '';
    let sentiment = '';
    try {
      const res = await client.query(
        'SELECT transcript, summary, sentiment, user_id FROM standups WHERE id = $1',
        [standup_id]
      );
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
      }
      if (res.rows[0].user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      transcript = res.rows[0].transcript ?? '';
      summary = res.rows[0].summary ?? '';
      sentiment = res.rows[0].sentiment ?? '';
    } finally {
      client.release();
    }

    const userContent = `Transcript: ${transcript}\nSummary: ${summary}\nSentiment: ${sentiment}`;
    const analysis = await gpt4oChatCompletion<{
      title: string;
      content: string;
      metadata: {
        clarityScore: number;
        actionabilityScore: number;
        topPatterns: string[];
        improvements: string[];
      };
    }>(STANDUP_IMPROVEMENT_PROMPT, userContent);

    // Persist as an AI insight
    const dbClient = await db.pool.connect();
    try {
      await dbClient.query(
        `INSERT INTO ai_insights (user_id, type, title, content, metadata, created_at)
         VALUES ($1, 'productivity_tip', $2, $3, $4, NOW())`,
        [
          session.user.id,
          analysis.title,
          analysis.content,
          JSON.stringify(analysis.metadata),
        ]
      );
    } finally {
      dbClient.release();
    }

    await auditLog({
      tableName: 'standups',
      recordId: standup_id,
      action: 'READ',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? null,
      newValues: { analyzed: true, insightTitle: analysis.title },
    });

    return NextResponse.json({ analysis }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Analyze standup error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
