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
        `SELECT provider, connected_at, expires_at FROM calendar_integrations WHERE user_id = $1`,
        [session.user.id]
      );
      const integrations = result.rows.map((r) => ({
        provider: r.provider as string,
        connectedAt: r.connected_at as string | null,
        expiresAt: r.expires_at as string | null,
      }));
      return NextResponse.json({ integrations }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Calendar status error:", message);
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
