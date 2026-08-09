import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await db.pool.connect();
    try {
      // Get team members for the current user
      const teamRes = await client.query(
        `SELECT team_id FROM team_members WHERE user_id = $1 LIMIT 1`,
        [session.user.id]
      );
      const teamId = teamRes.rows[0]?.team_id as string | undefined;

      let memberIds: string[] = [session.user.id];
      if (teamId) {
        const membersRes = await client.query(
          `SELECT user_id FROM team_members WHERE team_id = $1`,
          [teamId]
        );
        memberIds = membersRes.rows.map((r) => r.user_id as string);
      }

      // Get today's events for members
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const eventsRes = await client.query(
        `SELECT user_id, title, start_time, end_time FROM calendar_events
         WHERE user_id = ANY($1::text[])
           AND start_time >= $2
           AND start_time <= $3
         ORDER BY start_time ASC`,
        [memberIds, todayStart.toISOString(), todayEnd.toISOString()]
      );

      const events = eventsRes.rows.map((r) => ({
        userId: r.user_id as string,
        title: r.title as string,
        startTime: r.start_time as string,
        endTime: r.end_time as string,
      }));

      return NextResponse.json({ teamId, memberIds, events }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Calendar availability error:", message);
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
