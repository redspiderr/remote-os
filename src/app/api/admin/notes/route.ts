import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireManager } from '@/lib/admin-auth';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  note: z.string().min(1, 'Note is required').max(5000),
  tags: z.array(z.string().max(50)).optional().default([]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 });
    }

    const { memberId, note, tags } = parsed.data;

    // Derive team from member to enforce manager access
    const client = await db.pool.connect();
    try {
      const memberTeamRes = await client.query(
        `SELECT team_id FROM team_members WHERE user_id = $1 LIMIT 1`,
        [memberId]
      );
      const teamId = memberTeamRes.rows[0]?.team_id ?? null;
      const auth = await requireManager(teamId);
      if (!auth.authorized) return auth.response;

      const result = await client.query(
        `INSERT INTO manager_notes (manager_id, member_id, note, tags, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, manager_id, member_id, note, tags, created_at, updated_at`,
        [auth.userId, memberId, note, tags]
      );

      const row = result.rows[0];
      return NextResponse.json({
        id: row.id,
        managerId: row.manager_id,
        memberId: row.member_id,
        note: row.note,
        tags: row.tags ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }, { status: 201 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Notes POST error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const client = await db.pool.connect();
    try {
      // Derive team from member to enforce access
      const memberTeamRes = await client.query(
        `SELECT team_id FROM team_members WHERE user_id = $1 LIMIT 1`,
        [memberId]
      );
      const teamId = memberTeamRes.rows[0]?.team_id ?? null;
      const auth = await requireManager(teamId);
      if (!auth.authorized) return auth.response;

      const result = await client.query(
        `SELECT id, manager_id, member_id, note, tags, created_at, updated_at
         FROM manager_notes
         WHERE member_id = $1
         ORDER BY created_at DESC`,
        [memberId]
      );

      const notes = result.rows.map((r) => ({
        id: r.id,
        managerId: r.manager_id,
        memberId: r.member_id,
        note: r.note,
        tags: r.tags ?? [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      return NextResponse.json({ notes }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Notes GET error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
