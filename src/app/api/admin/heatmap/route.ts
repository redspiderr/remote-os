import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireManager } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const days = parseInt(searchParams.get('days') ?? '90', 10);

    const auth = await requireManager(teamId);
    if (!auth.authorized) return auth.response;

    const client = await db.pool.connect();
    try {
      let memberIds: string[] = [];
      if (teamId) {
        const membersRes = await client.query(`SELECT user_id FROM team_members WHERE team_id = $1`, [teamId]);
        memberIds = membersRes.rows.map((r) => r.user_id as string);
        if (memberIds.length === 0) {
          return NextResponse.json({ heatmap: [] }, { status: 200 });
        }
      }

      const idFilter = memberIds.length > 0 ? `AND user_id = ANY($2::uuid[])` : '';
      const params = memberIds.length > 0 ? [days, memberIds] : [days];

      const result = await client.query(
        `SELECT DATE(created_at) AS day, COUNT(*) AS count
         FROM standups
         WHERE created_at >= NOW() - INTERVAL '1 day' * $1 ${idFilter}
         GROUP BY day
         ORDER BY day`,
        params
      );

      const heatmap = result.rows.map((r) => ({
        date: r.day.toISOString().slice(0, 10),
        count: parseInt(r.count, 10),
      }));

      return NextResponse.json({ heatmap }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Heatmap error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
