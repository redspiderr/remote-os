import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { upsertConnectedApp, getConnectedApp } from "@/lib/integrations/db";

const connectSchema = z.object({
  webhook_url: z.string().url(),
  username: z.string().optional(),
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
    const { webhook_url, username } = parsed.data;
    await upsertConnectedApp(
      session.user.id,
      "discord",
      { webhookUrl: webhook_url, username: username ?? "Remote OS" },
      { webhookUrl: webhook_url }
    );
    return NextResponse.json({ ok: true, app: "discord" });
  } catch (err: unknown) {
    console.error("discord/connect error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const app = await getConnectedApp(session.user.id, "discord");
    if (!app) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({ connected: true, settings: app.settings, connected_at: app.connected_at });
  } catch (err: unknown) {
    console.error("discord/connect GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
