import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { summarizeTranscript } from '@/lib/openai';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface SummarizeRequest {
  transcript: string;
  user_id?: string;
  standup_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX: Add authentication check
    const session = await auth();
    if (!session?.user?.id) {
      await logSecurityEvent({
        event_type: 'auth_failure',
        severity: 'warning',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/summarize',
        method: 'POST',
        status_code: 401,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as SummarizeRequest;

    if (!body.transcript || typeof body.transcript !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "transcript" field.' },
        { status: 400 }
      );
    }

    // SECURITY FIX: Verify standup ownership before updating
    if (body.standup_id) {
      const client = await db.pool.connect();
      try {
        const ownershipRes = await client.query(
          'SELECT user_id FROM standups WHERE id = $1',
          [body.standup_id]
        );
        if (ownershipRes.rows.length === 0) {
          return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
        }
        if (ownershipRes.rows[0].user_id !== session.user.id) {
          await logSecurityEvent({
            event_type: 'unauthorized_access',
            severity: 'warning',
            user_id: session.user.id,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            endpoint: '/api/summarize',
            method: 'POST',
            status_code: 403,
          });
          return NextResponse.json({ error: 'Forbidden — not your standup' }, { status: 403 });
        }
      } finally {
        client.release();
      }
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
    // SECURITY FIX: Generic error message to avoid leaking internal details
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
