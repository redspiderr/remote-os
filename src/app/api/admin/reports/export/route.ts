import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireManager } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const format = searchParams.get('format') ?? 'csv';

    const auth = await requireManager(teamId);
    if (!auth.authorized) return auth.response;

    const client = await db.pool.connect();
    try {
      let memberIds: string[] = [];
      if (teamId) {
        const membersRes = await client.query(`SELECT user_id FROM team_members WHERE team_id = $1`, [teamId]);
        memberIds = membersRes.rows.map((r) => r.user_id as string);
      }

      const idFilter = memberIds.length > 0 ? `AND s.user_id = ANY($1::uuid[])` : '';
      const params = memberIds.length > 0 ? [memberIds] : [];

      if (format === 'csv') {
        const result = await client.query(
          `SELECT
            u.name,
            u.email,
            COUNT(s.id) AS standups_count,
            COALESCE(AVG(s.duration), 0) AS avg_duration,
            MAX(s.created_at) AS last_standup
          FROM users u
          LEFT JOIN standups s ON s.user_id = u.id ${idFilter}
          GROUP BY u.id, u.name, u.email
          ORDER BY standups_count DESC`,
          params
        );

        const headers = ['Name', 'Email', 'Standups', 'Avg Duration (s)', 'Last Standup'];
        const rows = result.rows.map((r) => [
          `"${(r.name ?? '').replace(/"/g, '""')}"`,
          `"${(r.email ?? '').replace(/"/g, '""')}"`,
          r.standups_count,
          Math.round(parseFloat(r.avg_duration)),
          r.last_standup ? r.last_standup.toISOString() : '',
        ]);

        const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="team-report-${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // PDF export stub — returns JSON with report data for client-side PDF generation
      const result = await client.query(
        `SELECT
          u.name,
          u.email,
          COUNT(s.id) AS standups_count,
          COALESCE(AVG(s.duration), 0) AS avg_duration,
          MAX(s.created_at) AS last_standup
        FROM users u
        LEFT JOIN standups s ON s.user_id = u.id ${idFilter}
        GROUP BY u.id, u.name, u.email
        ORDER BY standups_count DESC`,
        params
      );

      return NextResponse.json({
        format: 'pdf',
        generatedAt: new Date().toISOString(),
        data: result.rows.map((r) => ({
          name: r.name,
          email: r.email,
          standups: parseInt(r.standups_count, 10),
          avgDuration: Math.round(parseFloat(r.avg_duration)),
          lastStandup: r.last_standup ? r.last_standup.toISOString() : null,
        })),
      }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Export error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
