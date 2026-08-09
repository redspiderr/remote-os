import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { ZodError, z } from 'zod';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createSchema = z.object({
  video_url: z.string().min(1),
  transcript: z.string().optional(),
  summary: z.string().optional(),
  duration: z.number().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
  duration: z.number().optional(),
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
}

// ─── GET ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await db.pool.connect();
    try {
      const result = await client.query(
        `SELECT
           s.id,
           s.user_id,
           u.name AS user_name,
           u.avatar_url AS user_avatar,
           s.video_url,
           s.transcript,
           s.summary,
           s.blockers,
           s.action_items,
           s.sentiment,
           s.key_achievements,
           s.status,
           s.duration,
           s.created_at
         FROM standups s
         JOIN users u ON u.id = s.user_id
         WHERE s.user_id = $1
         ORDER BY s.created_at DESC`,
        [session.user.id]
      );

      const rows = result.rows.map((r) => ({
        id: r.id,
        user: {
          name: r.user_name ?? 'Unknown',
          avatar: r.user_avatar ?? null,
        },
        timestamp: r.created_at,
        status: mapStatus(r.status),
        transcript: r.transcript ?? '',
        summary: r.summary ?? '',
        videoUrl: r.video_url ?? undefined,
        durationSeconds: r.duration ?? undefined,
        blockers: r.blockers ?? [],
        action_items: r.action_items ?? [],
        sentiment: r.sentiment ?? null,
        key_achievements: r.key_achievements ?? [],
      }));

      await auditLog({
        tableName: 'standups',
        recordId: 'LIST',
        action: 'READ',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { count: rows.length },
      });

      return NextResponse.json({ standups: rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Standups GET error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error instanceof ZodError ? parsed.error.issues : [];
      return NextResponse.json({ error: 'Validation failed', issues }, { status: 400 });
    }

    const data = parsed.data;
    const client = await db.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO standups
           (user_id, video_url, transcript, summary, duration, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, user_id, video_url, transcript, summary, duration, status, created_at`,
        [
          session.user.id,
          data.video_url,
          data.transcript ?? null,
          data.summary ?? null,
          data.duration ?? null,
          data.status ?? 'pending',
        ]
      );

      const row = result.rows[0];

      await auditLog({
        tableName: 'standups',
        recordId: row.id,
        action: 'CREATE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { video_url: row.video_url, status: row.status, transcript: row.transcript, summary: row.summary },
      });

      return NextResponse.json(
        {
          id: row.id,
          user_id: row.user_id,
          video_url: row.video_url,
          transcript: row.transcript ?? '',
          summary: row.summary ?? '',
          duration: row.duration,
          status: row.status,
          created_at: row.created_at,
        },
        { status: 201 }
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Standups POST error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error instanceof ZodError ? parsed.error.issues : [];
      return NextResponse.json({ error: 'Validation failed', issues }, { status: 400 });
    }

    const { id, ...fields } = parsed.data;
    const client = await db.pool.connect();
    try {
      const setParts: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (fields.status !== undefined) {
        setParts.push(`status = $${idx++}`);
        values.push(fields.status);
      }
      if (fields.transcript !== undefined) {
        setParts.push(`transcript = $${idx++}`);
        values.push(fields.transcript);
      }
      if (fields.summary !== undefined) {
        setParts.push(`summary = $${idx++}`);
        values.push(fields.summary);
      }
      if (fields.duration !== undefined) {
        setParts.push(`duration = $${idx++}`);
        values.push(fields.duration);
      }

      if (setParts.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      // Ownership check
      const ownerRes = await client.query(
        'SELECT user_id FROM standups WHERE id = $1',
        [id]
      );
      if (ownerRes.rows.length === 0) {
        return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
      }
      if (ownerRes.rows[0].user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Fetch old values for audit
      const oldRes = await client.query('SELECT * FROM standups WHERE id = $1', [id]);
      const oldValues = oldRes.rows[0] ?? null;

      values.push(id);
      const query = `UPDATE standups SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await client.query(query, values);

      const row = result.rows[0];

      await auditLog({
        tableName: 'standups',
        recordId: id,
        action: 'UPDATE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        oldValues: oldValues ? { status: oldValues.status, transcript: oldValues.transcript, summary: oldValues.summary, duration: oldValues.duration } : null,
        newValues: { status: row.status, transcript: row.transcript, summary: row.summary, duration: row.duration },
      });

      return NextResponse.json(
        {
          id: row.id,
          user_id: row.user_id,
          video_url: row.video_url,
          transcript: row.transcript ?? '',
          summary: row.summary ?? '',
          duration: row.duration,
          status: row.status,
          created_at: row.created_at,
        },
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Standups PATCH error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const client = await db.pool.connect();
    try {
      const ownerRes = await client.query('SELECT * FROM standups WHERE id = $1', [id]);
      if (ownerRes.rows.length === 0) {
        return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
      }
      if (ownerRes.rows[0].user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await client.query('DELETE FROM standups WHERE id = $1', [id]);

      await auditLog({
        tableName: 'standups',
        recordId: id,
        action: 'DELETE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        oldValues: ownerRes.rows[0],
      });

      return NextResponse.json({ success: true }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Standups DELETE error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}

function mapStatus(status: string): 'Recorded' | 'Transcribed' | 'Summarized' {
  switch (status) {
    case 'pending':
      return 'Recorded';
    case 'processing':
      return 'Transcribed';
    case 'completed':
      return 'Summarized';
    default:
      return 'Recorded';
  }
}
