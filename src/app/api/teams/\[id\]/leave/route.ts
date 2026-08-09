import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { auditLog } from '@/lib/audit';

export const runtime = 'nodejs';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const client = await db.pool.connect();
    try {
      // Verify membership
      const memberCheck = await client.query(
        `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
        [id, session.user.id]
      );
      if (memberCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
      }

      // Prevent owner from leaving
      if (memberCheck.rows[0].role === 'owner') {
        return NextResponse.json({ error: 'Owner cannot leave team. Transfer ownership or delete team.' }, { status: 400 });
      }

      await client.query(
        `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`,
        [id, session.user.id]
      );

      await auditLog({
        tableName: 'team_members',
        recordId: id,
        action: 'DELETE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        oldValues: { teamId: id, userId: session.user.id },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Team leave error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
