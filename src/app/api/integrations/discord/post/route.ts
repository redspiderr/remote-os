import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { postDiscordWebhook } from "@/lib/integrations/discord";
import { decryptAppCredentials, getConnectedApp } from "@/lib/integrations/db";

const postSchema = z.object({
  content: z.string().min(1),
  embeds: z.array(z.any()).optional(),
  username: z.string().optional(),
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
    const { content, embeds, username } = parsed.data;

    const app = await getConnectedApp(session.user.id, "discord");
    if (!app) {
      return NextResponse.json({ error: "Discord not connected" }, { status: 404 });
    }
    const creds = decryptAppCredentials(app);
    if (!creds || typeof creds.webhookUrl !== "string") {
      return NextResponse.json({ error: "Missing Discord webhook URL" }, { status: 500 });
    }
    const result = await postDiscordWebhook(creds.webhookUrl as string, {
      content,
      embeds,
      username: username ?? (creds.username as string | undefined),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("discord/post error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
