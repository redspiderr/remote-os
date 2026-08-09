import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/calendar/callback`;
  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar"
  );
  return (
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${encodeURIComponent(state)}`
  );
}

function getOutlookAuthUrl(state: string): string {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/calendar/callback`;
  const scope = encodeURIComponent(
    "https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Calendars.Read offline_access openid email profile"
  );
  return (
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${scope}&` +
    `response_mode=query&` +
    `state=${encodeURIComponent(state)}`
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* ignore */ }
    const provider = body.provider === "outlook" ? "outlook" : "google";

    if (provider === "google" && !process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
    }
    if (provider === "outlook" && !process.env.OUTLOOK_CLIENT_ID) {
      return NextResponse.json({ error: "Outlook OAuth not configured" }, { status: 500 });
    }

    const state = JSON.stringify({
      userId: session.user.id,
      provider,
      nonce: crypto.randomUUID(),
    });

    const authUrl = provider === "outlook" ? getOutlookAuthUrl(state) : getGoogleAuthUrl(state);

    return NextResponse.json({ url: authUrl }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Calendar connect error:", message);
    return NextResponse.json({ error: "Internal server error", message }, { status: 500 });
  }
}
