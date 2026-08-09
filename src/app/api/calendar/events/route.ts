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
      const result = await client.query(
        `SELECT id, title, start_time, end_time FROM calendar_events
         WHERE user_id = $1
           AND start_time >= NOW() - INTERVAL '1 day'
         ORDER BY start_time ASC
         LIMIT 10`,
        [session.user.id]
      );
      const events = result.rows.map((r) => ({
        id: String(r.id),
        title: r.title as string,
        startTime: r.start_time as string,
        endTime: r.end_time as string,
      }));
      return NextResponse.json({ events }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Calendar events error:", message);
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
