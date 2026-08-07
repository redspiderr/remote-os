import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { ZodError, z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const sessionSchema = z.object({
  task: z.string().max(255).optional(),
  duration: z.number().int().min(1).max(360),
});

// ─── POST /api/focus/session ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = sessionSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error instanceof ZodError ? parsed.error.issues : [];
      return NextResponse.json({ error: 'Validation failed', issues }, { status: 400 });
    }

    const data = parsed.data;
    const client = await db.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO focus_sessions
           (user_id, task, duration, completed, created_at, completed_at)
         VALUES ($1, $2, $3, TRUE, NOW(), NOW())
         RETURNING id, user_id, task, duration, completed, created_at, completed_at`,
        [session.user.id, data.task ?? null, data.duration]
      );

      const row = result.rows[0];
      return NextResponse.json(
        {
          id: row.id,
          user_id: row.user_id,
          task: row.task ?? '',
          duration: row.duration,
          completed: row.completed,
          created_at: row.created_at,
          completed_at: row.completed_at,
        },
        { status: 201 }
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Focus POST error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}

// ─── GET /api/focus/stats ───────────────────────────────────────────────
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await db.pool.connect();
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const result = await client.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(duration), 0) AS total_minutes
         FROM focus_sessions
         WHERE user_id = $1 AND created_at >= $2 AND completed = TRUE`,
        [session.user.id, todayIso]
      );

      const row = result.rows[0];
      return NextResponse.json(
        {
          today: {
            sessions: parseInt(row.count, 10),
            totalMinutes: parseInt(row.total_minutes, 10),
          },
        },
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Focus GET error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
