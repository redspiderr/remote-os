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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now().toString(36);
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const createSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
});

// ─── GET (list my teams) ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await db.pool.connect();
    try {
      // Teams where I am owner or member
      const result = await client.query(
        `SELECT t.id, t.name, t.slug, t.invite_code, t.owner_id, t.created_at,
                tm.role, COUNT(DISTINCT tm2.user_id) as member_count
         FROM teams t
         LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
         LEFT JOIN team_members tm2 ON tm2.team_id = t.id
         WHERE t.owner_id = $1 OR tm.user_id = $1
         GROUP BY t.id, tm.role
         ORDER BY t.created_at DESC`,
        [session.user.id]
      );

      const teams = result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        inviteCode: r.owner_id === session.user?.id ? r.invite_code : null,
        ownerId: r.owner_id,
        role: r.role ?? 'owner',
        memberCount: parseInt(r.member_count, 10),
        createdAt: r.created_at,
      }));

      await auditLog({
        tableName: 'teams',
        recordId: 'LIST',
        action: 'READ',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { count: teams.length },
      });

      return NextResponse.json({ teams }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Teams GET error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST (create team) ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const { name } = parsed.data;
    const slug = slugify(name);
    const inviteCode = generateInviteCode();

    const client = await db.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO teams (name, slug, invite_code, owner_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, name, slug, invite_code, owner_id, created_at`,
        [name, slug, inviteCode, session.user.id]
      );

      const row = result.rows[0];

      // Add owner as a member
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role, joined_at)
         VALUES ($1, $2, 'owner', NOW())
         ON CONFLICT DO NOTHING`,
        [row.id, session.user.id]
      );

      await auditLog({
        tableName: 'teams',
        recordId: row.id,
        action: 'CREATE',
        userId: session.user.id,
        userEmail: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        newValues: { name, slug, invite_code: inviteCode },
      });

      await logSecurityEvent({
        eventType: 'api_access',
        severity: 'info',
        userId: session.user.id,
        email: session.user.email ?? null,
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? null,
        endpoint: '/api/teams',
        method: 'POST',
        statusCode: 201,
        details: { teamId: row.id, name },
      });

      return NextResponse.json({
        id: row.id,
        name: row.name,
        slug: row.slug,
        inviteCode: row.invite_code,
        ownerId: row.owner_id,
        createdAt: row.created_at,
      }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Teams POST error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
