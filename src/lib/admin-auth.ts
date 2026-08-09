import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

function isAdminEmail(email?: string | null): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.length > 0 && admins.includes((email ?? '').toLowerCase());
}

export async function requireManager(teamId?: string | null) {
  const session = await auth();
  if (!session?.user?.id) {
    return { authorized: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  // Global admin always passes
  if (isAdminEmail(session.user.email)) {
    return { authorized: true as const, userId: session.user.id, email: session.user.email ?? null };
  }

  if (!teamId) {
    return { authorized: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const client = await db.pool.connect();
  try {
    const res = await client.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, session.user.id]
    );
    const role = res.rows[0]?.role;
    if (role === 'owner' || role === 'manager') {
      return { authorized: true as const, userId: session.user.id, email: session.user.email ?? null };
    }
    return { authorized: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  } finally {
    client.release();
  }
}
