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
    const provider = body.provider === "outlook" ? "outlook" : "google";

    const client = await db.pool.connect();
    try {
      await client.query(
        `DELETE FROM calendar_integrations WHERE user_id = $1 AND provider = $2`,
        [session.user.id, provider]
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Calendar disconnect error:", message);
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
