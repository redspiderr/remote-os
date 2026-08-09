import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { postSlackMessage, slackBotPost } from "@/lib/integrations/slack";
import { decryptAppCredentials, getConnectedApp } from "@/lib/integrations/db";

const postSchema = z.object({
  text: z.string().min(1),
  blocks: z.array(z.record(z.string(), z.any())).optional(),
  channel: z.string().optional(),
  use_webhook: z.boolean().optional(),
  webhook_url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { text, blocks, channel, use_webhook, webhook_url } = parsed.data;

    if (use_webhook && webhook_url) {
      const result = await postSlackMessage(webhook_url, { text, blocks, channel });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }
      return NextResponse.json({ ok: true, method: "webhook" });
    }

    const app = await getConnectedApp(session.user.id, "slack");
    if (!app) {
      return NextResponse.json({ error: "Slack not connected" }, { status: 404 });
    }
    const creds = decryptAppCredentials(app);
    if (!creds || typeof creds.accessToken !== "string") {
      return NextResponse.json({ error: "Missing Slack credentials" }, { status: 500 });
    }
    const targetChannel = channel ?? (app.settings as Record<string, unknown>).channel as string | undefined;
    if (!targetChannel) {
      return NextResponse.json({ error: "No channel configured" }, { status: 400 });
    }
    const result = await slackBotPost(creds.accessToken as string, targetChannel, { text, blocks });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, method: "bot", ts: result.ts });
  } catch (err: unknown) {
    console.error("slack/post error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
