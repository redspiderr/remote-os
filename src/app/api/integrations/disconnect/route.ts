import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteConnectedApp } from "@/lib/integrations/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { app } = body as { app?: string };
    if (!app || typeof app !== "string") {
      return NextResponse.json({ error: "Missing app" }, { status: 400 });
    }
    await deleteConnectedApp(session.user.id, app);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("integrations/disconnect error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
