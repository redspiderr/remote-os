import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptToken } from "@/lib/calendar/token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const stateRaw = searchParams.get("state");

    if (!code || !stateRaw) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    let state: { userId?: string; provider?: string };
    try {
      state = JSON.parse(stateRaw) as { userId?: string; provider?: string };
    } catch {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    const { userId, provider } = state;
    if (!userId || !provider) {
      return NextResponse.json({ error: "Invalid state payload" }, { status: 400 });
    }

    // Verify session matches userId
    const session = await auth();
    if (!session?.user?.id || session.user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let tokenRes: Response;
    let tokenData: Record<string, unknown>;

    if (provider === "google") {
      tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID ?? "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
          code,
          redirect_uri: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/calendar/callback`,
          grant_type: "authorization_code",
        }),
      });
    } else {
      tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.OUTLOOK_CLIENT_ID ?? "",
          client_secret: process.env.OUTLOOK_CLIENT_SECRET ?? "",
          code,
          redirect_uri: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/calendar/callback`,
          grant_type: "authorization_code",
        }),
      });
    }

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return NextResponse.json({ error: "Token exchange failed", detail: text }, { status: 500 });
    }

    tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string;
    const refreshToken = (tokenData.refresh_token as string | undefined) ?? "";
    const expiresIn = (tokenData.expires_in as number | undefined) ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const client = await db.pool.connect();
    try {
      await client.query(
        `INSERT INTO calendar_integrations
         (user_id, provider, access_token, refresh_token, expires_at, connected_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, provider) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = COALESCE(EXCLUDED.refresh_token, calendar_integrations.refresh_token),
           expires_at = EXCLUDED.expires_at,
           connected_at = NOW()`,
        [
          userId,
          provider,
          encryptToken(accessToken),
          refreshToken ? encryptToken(refreshToken) : null,
          expiresAt,
        ]
      );
    } finally {
      client.release();
    }

    return NextResponse.redirect(
      new URL("/settings?tab=calendar&connected=true", request.url)
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Calendar callback error:", message);
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
