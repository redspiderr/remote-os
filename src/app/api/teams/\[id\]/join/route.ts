import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { logSecurityEvent } from '@/lib/security-logger';
import { auditLog } from '@/lib/audit';

export const runtime = 'nodejs';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
}

const joinSchema = z.object({
  inviteCode: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
    }

    const { inviteCode } = parsed.data;
    const client = await db.pool.connect();
    try {
      const teamRes = await client.query(
        `SELECT invite_code, owner_id FROM teams WHERE id = $1`,
        [id]
      );
      if (teamRes.rows.length === 0) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      const team = teamRes.rows[0];
      if (team.invite_code !== inviteCode) {
        await logSecurityEvent({
          eventType: 'auth_failure',
          severity: 'warning',
          userId: session.user.id,
          email: session.user.email ?? null,
          ip: getClientIp(request),
          userAgent: request.headers.get('user-agent') ?? null,
          endpoint: `/api/teams/${id}/join`,
          method: 'POST',
          statusCode: 403,
          details: { reason: 'invalid_invite_code', teamId: id },
        });
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 });
      }

      // Can't join if already owner
      if (team.owner_id === session.user.id) {
        return NextResponse.json({ error: 'You are already the owner' }, { status: 400 });
      }

      await client.query(
        `INSERT INTO team_members (team_id, user_id, role, joined_at)
         VALUES ($1, $2, 'member', NOW())
         ON CONFLICT DO NOTHING`,
        [id, session.user.id]
      );

      await auditLog({
        tableName: 'team_members',
        recordId: id,
        action: 'CREATE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { teamId: id, role: 'member' },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Team join error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
