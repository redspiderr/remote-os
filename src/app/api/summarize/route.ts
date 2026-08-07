import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { summarizeTranscript } from '@/lib/openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface SummarizeRequest {
  transcript: string;
  user_id?: string;
  standup_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SummarizeRequest;

    if (!body.transcript || typeof body.transcript !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "transcript" field.' },
        { status: 400 }
      );
    }

    const summary = await summarizeTranscript(body.transcript);

    // Persist to DB if identifiers are provided
    if (body.standup_id || body.user_id) {
      const client = await db.pool.connect();
      try {
        await client.query(
          `UPDATE standups
             SET summary = $1,
                 blockers = $2::jsonb,
                 action_items = $3::jsonb,
                 sentiment = $4,
                 key_achievements = $5::jsonb,
                 status = 'completed'
           WHERE id = $6`,
          [
            summary.summary,
            JSON.stringify(summary.blockers),
            JSON.stringify(summary.action_items),
            summary.sentiment,
            JSON.stringify(summary.key_achievements),
            body.standup_id,
          ]
        );
      } finally {
        client.release();
      }
    }

    return NextResponse.json(summary, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Summarize route error:', message);
    return NextResponse.json(
      { error: 'Internal server error', message },
      { status: 500 }
    );
  }
}
