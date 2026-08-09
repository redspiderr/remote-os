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
      // Team member IDs (if teamId provided, else all)
      let memberIds: string[] = [];
      if (teamId) {
        const membersRes = await client.query(
          `SELECT user_id FROM team_members WHERE team_id = $1`,
          [teamId]
        );
        memberIds = membersRes.rows.map((r) => r.user_id as string);
        if (memberIds.length === 0) {
          return NextResponse.json({ range: range.label, metrics: {} }, { status: 200 });
        }
      }

      const idFilter = memberIds.length > 0 ? `AND user_id = ANY($3::uuid[])` : '';
      const params = memberIds.length > 0 ? [fromIso, toIso, memberIds] : [fromIso, toIso];

      const totalMembersRes = await client.query(
        teamId
          ? `SELECT COUNT(*) AS count FROM team_members WHERE team_id = $1`
          : `SELECT COUNT(*) AS count FROM users`,
        teamId ? [teamId] : []
      );
      const totalMembers = parseInt(totalMembersRes.rows[0].count, 10);

      const activeRes = await client.query(
        `SELECT COUNT(DISTINCT user_id) AS count FROM standups WHERE created_at >= $1 AND created_at <= $2 ${idFilter}`,
        params
      );
      const activeMembers = parseInt(activeRes.rows[0].count, 10);

      const totalStandupsRes = await client.query(
        `SELECT COUNT(*) AS count FROM standups WHERE created_at >= $1 AND created_at <= $2 ${idFilter}`,
        params
      );
      const totalStandups = parseInt(totalStandupsRes.rows[0].count, 10);

      const completedRes = await client.query(
        `SELECT COUNT(*) AS count FROM standups WHERE status = 'completed' AND created_at >= $1 AND created_at <= $2 ${idFilter}`,
        params
      );
      const completedStandups = parseInt(completedRes.rows[0].count, 10);
      const completionRate = totalStandups > 0 ? Math.round((completedStandups / totalStandups) * 100) : 0;

      const avgDurationRes = await client.query(
        `SELECT AVG(duration) AS avg FROM standups WHERE duration IS NOT NULL AND created_at >= $1 AND created_at <= $2 ${idFilter}`,
        params
      );
      const avgDuration = Math.round(parseFloat(avgDurationRes.rows[0].avg ?? '0'));

      const moodRes = await client.query(
        `SELECT AVG(mood)::float AS avg_mood FROM mood_logs WHERE created_at >= $1 AND created_at <= $2 ${idFilter.replace('user_id', 'mood_logs.user_id')}`,
        params
      );
      const avgMood = moodRes.rows[0].avg_mood ? Math.round(parseFloat(moodRes.rows[0].avg_mood) * 10) / 10 : null;

      // Daily trend for the team
      const dailyRes = await client.query(
        `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM standups WHERE created_at >= $1 AND created_at <= $2 ${idFilter} GROUP BY day ORDER BY day`,
        params
      );
      const dailyTrend = dailyRes.rows.map((r) => ({
        date: r.day.toISOString().slice(0, 10),
        value: parseInt(r.count, 10),
      }));

      return NextResponse.json({
        range: range.label,
        members: { total: totalMembers, active: activeMembers },
        standups: { total: totalStandups, completed: completedStandups, completionRate, avgDuration },
        avgMood,
        dailyTrend,
      }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Team analytics error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
