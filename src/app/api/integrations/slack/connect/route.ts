import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { upsertConnectedApp, getConnectedApp } from "@/lib/integrations/db";

const connectSchema = z.object({
  access_token: z.string().min(1),
  team_name: z.string().optional(),
  channel: z.string().optional(),
  bot_user_id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = connectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { access_token, team_name, channel, bot_user_id } = parsed.data;
    await upsertConnectedApp(
      session.user.id,
      "slack",
      { accessToken: access_token, teamName: team_name, channel, botUserId: bot_user_id },
      { channel: channel ?? null }
    );
    return NextResponse.json({ ok: true, app: "slack" });
  } catch (err: unknown) {
    console.error("slack/connect error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const app = await getConnectedApp(session.user.id, "slack");
    if (!app) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({ connected: true, settings: app.settings, connected_at: app.connected_at });
  } catch (err: unknown) {
    console.error("slack/connect GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
