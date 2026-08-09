import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const updateGoalSchema = z.object({
  progress: z.number().int().min(0).max(100).optional(),
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  category: z.string().max(50).optional(),
  deadline: z.string().datetime().optional(),
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const client = await db.pool.connect();
    try {
      const ownerRes = await client.query('SELECT user_id FROM goals WHERE id = $1', [id]);
      if (ownerRes.rows.length === 0) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
      if (ownerRes.rows[0].user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const setParts: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let idx = 1;

      if (data.progress !== undefined) {
        setParts.push(`progress = $${idx++}`);
        values.push(data.progress);
      }
      if (data.status !== undefined) {
        setParts.push(`status = $${idx++}`);
        values.push(data.status);
      }
      if (data.title !== undefined) {
        setParts.push(`title = $${idx++}`);
        values.push(data.title);
      }
      if (data.description !== undefined) {
        setParts.push(`description = $${idx++}`);
        values.push(data.description);
      }
      if (data.category !== undefined) {
        setParts.push(`category = $${idx++}`);
        values.push(data.category);
      }
      if (data.deadline !== undefined) {
        setParts.push(`deadline = $${idx++}`);
        values.push(data.deadline ? new Date(data.deadline) : null);
      }

      if (setParts.length === 1) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      values.push(id);
      const query = `UPDATE goals SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING id, title, description, category, deadline, status, progress, created_at, updated_at`;
      const result = await client.query(query, values);
      const row = result.rows[0];

      await auditLog({
        tableName: 'goals',
        recordId: id,
        action: 'UPDATE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { status: row.status, progress: row.progress },
      });

      return NextResponse.json(row, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Goal PATCH error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const client = await db.pool.connect();
    try {
      const ownerRes = await client.query('SELECT user_id FROM goals WHERE id = $1', [id]);
      if (ownerRes.rows.length === 0) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
      if (ownerRes.rows[0].user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await client.query('DELETE FROM goals WHERE id = $1', [id]);

      await auditLog({
        tableName: 'goals',
        recordId: id,
        action: 'DELETE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
      });

      return NextResponse.json({ success: true }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Goal DELETE error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
