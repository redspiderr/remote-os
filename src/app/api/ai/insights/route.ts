import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const type = searchParams.get('type') ?? undefined;
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 100);

    const client = await db.pool.connect();
    try {
      const conditions: string[] = ['user_id = $1'];
      const values: unknown[] = [session.user.id];
      let idx = 2;

      if (type) {
        conditions.push(`type = $${idx++}`);
        values.push(type);
      }
      if (unreadOnly) {
        conditions.push('read = FALSE');
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `SELECT id, type, title, content, metadata, read, created_at FROM ai_insights ${where} ORDER BY created_at DESC LIMIT $${idx}`;
      values.push(limit);

      const result = await client.query(query, values);

      await auditLog({
        tableName: 'ai_insights',
        recordId: 'LIST',
        action: 'READ',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { count: result.rows.length },
      });

      return NextResponse.json({ insights: result.rows }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Insights GET error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, read } = body as { id?: string; read?: boolean };
    if (!id || typeof read !== 'boolean') {
      return NextResponse.json({ error: 'Missing id or read field' }, { status: 400 });
    }

    const client = await db.pool.connect();
    try {
      const ownerRes = await client.query('SELECT user_id FROM ai_insights WHERE id = $1', [id]);
      if (ownerRes.rows.length === 0) {
        return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
      }
      if (ownerRes.rows[0].user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await client.query('UPDATE ai_insights SET read = $1 WHERE id = $2', [read, id]);

      await auditLog({
        tableName: 'ai_insights',
        recordId: id,
        action: 'UPDATE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { read },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Insights PATCH error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
