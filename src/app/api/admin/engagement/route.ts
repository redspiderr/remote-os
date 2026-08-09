import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireManager } from '@/lib/admin-auth';
import { daysBack, toISOUTC, DATE_RANGES } from '@/lib/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const rangeKey = searchParams.get('range') ?? 'week';

    const auth = await requireManager(teamId);
    if (!auth.authorized) return auth.response;

    const range = DATE_RANGES[rangeKey] ?? DATE_RANGES.week;
    const fromIso = toISOUTC(range.from);
    const toIso = toISOUTC(range.to);

    const client = await db.pool.connect();
    try {
      let memberIds: string[] = [];
      if (teamId) {
        const membersRes = await client.query(`SELECT user_id FROM team_members WHERE team_id = $1`, [teamId]);
        memberIds = membersRes.rows.map((r) => r.user_id as string);
        if (memberIds.length === 0) {
          return NextResponse.json({ range: range.label, engagement: [] }, { status: 200 });
        }
      }

      const idFilter = memberIds.length > 0 ? `AND s.user_id = ANY($3::uuid[])` : '';
      const params = memberIds.length > 0 ? [fromIso, toIso, memberIds] : [fromIso, toIso];

      const result = await client.query(
        `SELECT
          u.id,
          u.name,
          u.avatar_url,
          COUNT(s.id) AS standups_count,
          COALESCE(AVG(s.duration), 0) AS avg_duration,
          MAX(s.created_at) AS last_standup,
          COUNT(DISTINCT DATE(s.created_at)) AS active_days
        FROM users u
        LEFT JOIN standups s ON s.user_id = u.id AND s.created_at >= $1 AND s.created_at <= $2 ${idFilter}
        WHERE ${memberIds.length > 0 ? 'u.id = ANY($3::uuid[])' : 'TRUE'}
        GROUP BY u.id, u.name, u.avatar_url
        ORDER BY standups_count DESC`,
        params
      );

      const totalDays = Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      const engagement = result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar_url,
        standups: parseInt(r.standups_count, 10),
        avgDuration: Math.round(parseFloat(r.avg_duration)),
        lastStandup: r.last_standup ? r.last_standup.toISOString() : null,
        participationRate: Math.round((parseInt(r.active_days ?? '0', 10) / totalDays) * 100),
      }));

      return NextResponse.json({ range: range.label, engagement }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Engagement error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
