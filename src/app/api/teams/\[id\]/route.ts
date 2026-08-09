import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { auditLog } from '@/lib/audit';

export const runtime = 'nodejs';

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        return NextResponse.json({ error: 'Forbidden — not a team member' }, { status: 403 });
      }

      const teamRes = await client.query(
        `SELECT id, name, slug, invite_code, owner_id, created_at FROM teams WHERE id = $1`,
        [id]
      );
      if (teamRes.rows.length === 0) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }

      const membersRes = await client.query(
        `SELECT tm.user_id, tm.role, tm.joined_at, u.name, u.avatar_url
         FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.team_id = $1
         ORDER BY tm.joined_at ASC`,
        [id]
      );

      const team = teamRes.rows[0];
      const members = membersRes.rows.map((r) => ({
        userId: r.user_id,
        name: r.name,
        avatar: r.avatar_url,
        role: r.role,
        joinedAt: r.joined_at,
      }));

      await auditLog({
        tableName: 'teams',
        recordId: id,
        action: 'READ',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { memberCount: members.length },
      });

      return NextResponse.json({
        id: team.id,
        name: team.name,
        slug: team.slug,
        inviteCode: team.owner_id === session.user.id ? team.invite_code : null,
        ownerId: team.owner_id,
        createdAt: team.created_at,
        myRole: memberCheck.rows[0].role,
        members,
      }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Team GET error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
