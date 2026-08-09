import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* ignore */ }

    const title = typeof body.title === "string" ? body.title : "Standup";
    const startTime = typeof body.startTime === "string" ? body.startTime : new Date().toISOString();
    const durationMinutes = typeof body.duration === "number" ? body.duration : 30;

    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const client = await db.pool.connect();
    try {
      await client.query(
        `INSERT INTO calendar_events (user_id, title, start_time, end_time, source, created_at)
         VALUES ($1, $2, $3, $4, 'manual', NOW())`,
        [session.user.id, title, start.toISOString(), end.toISOString()]
      );
      return NextResponse.json({ ok: true, title, startTime: start.toISOString(), endTime: end.toISOString() }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Calendar schedule error:", message);
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
