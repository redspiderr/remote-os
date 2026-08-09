import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { reminderTemplate } from "@/lib/email-templates";
import { logSecurityEvent } from "@/lib/security-logger";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// ─── POST /api/notifications/remind ─────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX: Add authentication check
    const session = await auth();
    if (!session?.user?.id) {
      await logSecurityEvent({
        eventType: 'auth_failure',
        severity: 'warning',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/notifications/remind',
        method: 'POST',
        statusCode: 401,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY FIX: Rate limiting — max 1 reminder request per user per hour
    const limitResult = rateLimit(request, { maxRequests: 1, windowMs: 60 * 60 * 1000 });
    if (!limitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    // Optional explicit list of user IDs to remind
    const explicitUserIds = Array.isArray(body.user_ids)
      ? (body.user_ids as string[]).filter((id) => typeof id === "string")
      : null;

    const { start, end } = getTodayRange();

    const client = await db.pool.connect();
    try {
      let usersToRemind: { id: string; name: string; email: string; team_name?: string }[] = [];

      if (explicitUserIds && explicitUserIds.length > 0) {
        // Query specific users
        const userRes = await client.query(
          `SELECT u.id, u.name, u.email, t.name AS team_name
           FROM users u
           LEFT JOIN teams t ON t.id = u.team_id
           WHERE u.id = ANY($1::uuid[])
             AND u.email IS NOT NULL`,
          [explicitUserIds]
        );
        usersToRemind = userRes.rows.map((r) => ({
          id: r.id as string,
          name: r.name as string,
          email: r.email as string,
          team_name: (r.team_name as string) || undefined,
        }));
      } else {
        // Find all users who have NOT submitted a standup today
        const missedRes = await client.query(
          `SELECT u.id, u.name, u.email, t.name AS team_name
           FROM users u
           LEFT JOIN teams t ON t.id = u.team_id
           WHERE NOT EXISTS (
             SELECT 1 FROM standups s
             WHERE s.user_id = u.id
               AND s.created_at >= $1
               AND s.created_at < $2
           )
             AND u.email IS NOT NULL`,
          [start.toISOString(), end.toISOString()]
        );
        usersToRemind = missedRes.rows.map((r) => ({
          id: r.id as string,
          name: r.name as string,
          email: r.email as string,
          team_name: (r.team_name as string) || undefined,
        }));
      }

      const sent: { userId: string; email: string; ok: boolean; error?: string }[] = [];

      for (const user of usersToRemind) {
        const { html, text } = reminderTemplate({
          userName: user.name,
          teamName: user.team_name,
        });

        try {
          await sendEmail({
            to: user.email,
            subject: "⏰ Reminder: Submit your daily standup",
            text,
            html,
          });
          sent.push({ userId: user.id, email: user.email, ok: true });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          sent.push({ userId: user.id, email: user.email, ok: false, error: msg });
        }
      }

      const successCount = sent.filter((s) => s.ok).length;
      const failCount = sent.length - successCount;

      return NextResponse.json(
        {
          ok: true,
          reminded: successCount,
          failed: failCount,
          total: sent.length,
          details: sent,
        },
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Remind POST error:", message);
    // SECURITY FIX: Generic error message
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
