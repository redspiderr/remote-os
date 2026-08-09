import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const moodSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  standup_id: z.string().uuid().optional(),
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(Number(searchParams.get('days') ?? '30'), 365);

    const client = await db.pool.connect();
    try {
      const result = await client.query(
        `SELECT id, mood, energy, notes, standup_id, created_at FROM mood_logs
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
         ORDER BY created_at DESC`,
        [session.user.id]
      );

      await auditLog({
        tableName: 'mood_logs',
        recordId: 'LIST',
        action: 'READ',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { count: result.rows.length },
      });

      return NextResponse.json({ moods: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Mood GET error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = moodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const client = await db.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO mood_logs (user_id, mood, energy, notes, standup_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, mood, energy, notes, standup_id, created_at`,
        [
          session.user.id,
          data.mood,
          data.energy ?? null,
          data.notes ?? null,
          data.standup_id ?? null,
        ]
      );

      const row = result.rows[0];

      await auditLog({
        tableName: 'mood_logs',
        recordId: row.id,
        action: 'CREATE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { mood: row.mood, energy: row.energy },
      });

      return NextResponse.json(row, { status: 201 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Mood POST error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
