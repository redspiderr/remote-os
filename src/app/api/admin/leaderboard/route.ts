import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireManager } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);

    const auth = await requireManager(teamId);
    if (!auth.authorized) return auth.response;

    const client = await db.pool.connect();
    try {
      let memberIds: string[] = [];
      if (teamId) {
        const membersRes = await client.query(`SELECT user_id FROM team_members WHERE team_id = $1`, [teamId]);
        memberIds = membersRes.rows.map((r) => r.user_id as string);
        if (memberIds.length === 0) {
          return NextResponse.json({ leaderboard: [] }, { status: 200 });
        }
      }

      const idFilter = memberIds.length > 0 ? `AND s.user_id = ANY($2::uuid[])` : '';
      const params = memberIds.length > 0 ? [limit, memberIds] : [limit];

      const result = await client.query(
        `SELECT
          u.id,
          u.name,
          u.avatar_url,
          COUNT(s.id) AS standups_count,
          COALESCE(AVG(s.duration), 0) AS avg_duration,
          MAX(s.created_at) AS last_standup,
          COUNT(DISTINCT DATE(s.created_at)) AS streak_days
        FROM users u
        LEFT JOIN standups s ON s.user_id = u.id
        WHERE (s.created_at IS NULL OR s.created_at >= NOW() - INTERVAL '30 days') ${idFilter}
        GROUP BY u.id, u.name, u.avatar_url
        ORDER BY standups_count DESC, streak_days DESC
        LIMIT $1`,
        params
      );

      const leaderboard = result.rows.map((r, idx) => ({
        rank: idx + 1,
        id: r.id,
        name: r.name,
        avatar: r.avatar_url,
        standups: parseInt(r.standups_count, 10),
        avgDuration: Math.round(parseFloat(r.avg_duration)),
        lastStandup: r.last_standup ? r.last_standup.toISOString() : null,
        streakDays: parseInt(r.streak_days ?? '0', 10),
      }));

      return NextResponse.json({ leaderboard }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Leaderboard error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
