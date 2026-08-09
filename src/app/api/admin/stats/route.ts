import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  daysBack,
  fillDailyGaps,
  toISOUTC,
  DATE_RANGES,
} from '@/lib/analytics';
import { getSecuritySummary } from '@/lib/security-logger';
import { getIntrusionSnapshot } from '@/lib/intrusion-detection';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAdmin(user: { email?: string | null }): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.length > 0 && admins.includes((user.email ?? '').toLowerCase());
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rangeKey = searchParams.get('range') ?? 'week';
    const range = DATE_RANGES[rangeKey] ?? DATE_RANGES.week;

    const client = await db.pool.connect();
    try {
      const fromIso = toISOUTC(range.from);
      const toIso = toISOUTC(range.to);

      // ─── Users ─────────────────────────────────────────────────────
      const totalUsersRes = await client.query(`SELECT COUNT(*) AS count FROM users`);
      const totalUsers = parseInt(totalUsersRes.rows[0].count, 10);

      const activeUsersRes = await client.query(
        `SELECT COUNT(DISTINCT user_id) AS count FROM standups WHERE created_at >= $1 AND created_at <= $2`,
        [fromIso, toIso]
      );
      const activeUsers = parseInt(activeUsersRes.rows[0].count, 10);

      const newSignupsRes = await client.query(
        `SELECT COUNT(*) AS count FROM users WHERE created_at >= $1 AND created_at <= $2`,
        [startOfDay(), toIso]
      );
      const newSignupsThisWeek = parseInt(newSignupsRes.rows[0].count, 10);

      // ─── Standups ────────────────────────────────────────────────────
      const totalStandupsRes = await client.query(`SELECT COUNT(*) AS count FROM standups`);
      const totalStandups = parseInt(totalStandupsRes.rows[0].count, 10);

      const periodStandupsRes = await client.query(
        `SELECT COUNT(*) AS count FROM standups WHERE created_at >= $1 AND created_at <= $2`,
        [fromIso, toIso]
      );
      const periodStandups = parseInt(periodStandupsRes.rows[0].count, 10);

      const completedRes = await client.query(
        `SELECT COUNT(*) AS count FROM standups WHERE status = 'completed' AND created_at >= $1 AND created_at <= $2`,
        [fromIso, toIso]
      );
      const completedStandups = parseInt(completedRes.rows[0].count, 10);
      const completionRate = periodStandups > 0 ? Math.round((completedStandups / periodStandups) * 100) : 0;

      const avgDurationRes = await client.query(
        `SELECT AVG(duration) AS avg FROM standups WHERE duration IS NOT NULL AND created_at >= $1 AND created_at <= $2`,
        [fromIso, toIso]
      );
      const avgDuration = Math.round(parseFloat(avgDurationRes.rows[0].avg ?? '0'));

      // ─── Daily trend ───────────────────────────────────────────────
      const dailyRes = await client.query(
        `SELECT DATE(created_at) AS day, COUNT(*) AS count
         FROM standups
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY day
         ORDER BY day`,
        [fromIso, toIso]
      );
      const dailyTrend = fillDailyGaps(
        dailyRes.rows.map((r) => ({ date: r.day.toISOString().slice(0, 10), value: parseInt(r.count, 10) })),
        range
      );

      // ─── Status distribution ───────────────────────────────────────
      const statusRes = await client.query(
        `SELECT status, COUNT(*) AS count
         FROM standups
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY status`,
        [fromIso, toIso]
      );
      const statusDistribution = statusRes.rows.map((r) => ({
        name: r.status,
        value: parseInt(r.count, 10),
      }));

      // ─── Team leaderboard ───────────────────────────────────────────
      const teamRes = await client.query(
        `SELECT
           u.id,
           u.name,
           u.avatar_url,
           COUNT(s.id) AS standups_count,
           COALESCE(AVG(s.duration), 0) AS avg_duration,
           MAX(s.created_at) AS last_standup
         FROM users u
         LEFT JOIN standups s ON s.user_id = u.id AND s.created_at >= $1 AND s.created_at <= $2
         GROUP BY u.id, u.name, u.avatar_url
         ORDER BY standups_count DESC
         LIMIT 20`,
        [fromIso, toIso]
      );
      const leaderboard = teamRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar_url,
        standups: parseInt(r.standups_count, 10),
        avgDuration: Math.round(parseFloat(r.avg_duration)),
        lastStandup: r.last_standup ? r.last_standup.toISOString() : null,
      }));

      // ─── Revenue (stub ready for Stripe / pricing integration) ──────
      const revenue = {
        total: 0,
        mrr: 0,
        arpu: totalUsers > 0 ? 0 : 0,
        trials: 0,
        paidUsers: 0,
      };

      // ─── Security snapshot ──────────────────────────────────────────
      const security = await getSecuritySummary(24);
      const intrusion = getIntrusionSnapshot();

      return NextResponse.json(
        {
          range: range.label,
          users: {
            total: totalUsers,
            active: activeUsers,
            newSignupsThisWeek: newSignupsThisWeek,
          },
          standups: {
            total: totalStandups,
            period: periodStandups,
            completed: completedStandups,
            completionRate,
            avgDuration,
          },
          charts: {
            dailyTrend,
            statusDistribution,
          },
          leaderboard,
          revenue,
          security,
          intrusion,
        },
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Admin stats error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
