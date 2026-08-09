import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createGoalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  category: z.string().max(50).optional(),
  deadline: z.string().datetime().optional(),
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
    const status = searchParams.get('status') ?? undefined;

    const client = await db.pool.connect();
    try {
      const conditions: string[] = ['user_id = $1'];
      const values: unknown[] = [session.user.id];
      let idx = 2;

      if (status) {
        conditions.push(`status = $${idx++}`);
        values.push(status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `SELECT id, title, description, category, deadline, status, progress, created_at, updated_at FROM goals ${where} ORDER BY updated_at DESC`;

      const result = await client.query(query, values);

      await auditLog({
        tableName: 'goals',
        recordId: 'LIST',
        action: 'READ',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { count: result.rows.length },
      });

      return NextResponse.json({ goals: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Goals GET error:', message);
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
    const parsed = createGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const client = await db.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO goals (user_id, title, description, category, deadline, status, progress, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', 0, NOW(), NOW())
         RETURNING id, title, description, category, deadline, status, progress, created_at, updated_at`,
        [
          session.user.id,
          data.title,
          data.description ?? null,
          data.category ?? 'productivity',
          data.deadline ? new Date(data.deadline) : null,
        ]
      );

      const row = result.rows[0];

      await auditLog({
        tableName: 'goals',
        recordId: row.id,
        action: 'CREATE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { title: row.title, category: row.category, status: row.status },
      });

      return NextResponse.json(row, { status: 201 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Goals POST error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
