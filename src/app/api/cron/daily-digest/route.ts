import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { dailyDigestTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET = process.env.CRON_SECRET;

function getYesterdayRange(): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export async function GET(request: NextRequest) {
  try {
    // ─── Auth guard ─────────────────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    const querySecret = request.nextUrl.searchParams.get("secret");

    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }

    const provided = token || querySecret || "";
    if (provided !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── Date range for yesterday ───────────────────────────────────
    const { start, end } = getYesterdayRange();

    const client = await db.pool.connect();
    try {
      // ─── Fetch teams + members ────────────────────────────────────
      const teamsRes = await client.query(`
        SELECT t.id, t.name, t.slug
        FROM teams t
        ORDER BY t.name
      `);

      const results: { team: string; emailsSent: number; error?: string }[] = [];

      for (const teamRow of teamsRes.rows) {
        const teamId = teamRow.id as string;
        const teamName = teamRow.name as string;

        // All team members
        const membersRes = await client.query(
          `SELECT id, email, name FROM users WHERE team_id = $1`,
          [teamId]
        );
        const members = membersRes.rows.map((r) => ({
          id: r.id as string,
          email: r.email as string,
          name: r.name as string,
        }));

        if (members.length === 0) continue;

        // Yesterday's standups for this team
        const standupsRes = await client.query(
          `SELECT
             s.id,
             s.user_id,
             u.name AS user_name,
             s.summary,
             s.blockers,
             s.status,
             s.duration,
             s.created_at
           FROM standups s
           JOIN users u ON u.id = s.user_id
           WHERE u.team_id = $1
             AND s.created_at >= $2
             AND s.created_at < $3
           ORDER BY s.created_at DESC`,
          [teamId, start.toISOString(), end.toISOString()]
        );

        const submittedUserIds = new Set<string>();
        const standups = standupsRes.rows.map((r) => {
          submittedUserIds.add(r.user_id as string);
          return {
            id: r.id as string,
            userName: r.user_name as string,
            status: mapStatus(r.status as string),
            summary: (r.summary as string) || "",
            blockers: Array.isArray(r.blockers)
              ? r.blockers
              : JSON.parse((r.blockers as string) || "[]"),
            durationSeconds: (r.duration as number) ?? undefined,
            createdAt: r.created_at as string,
          };
        });

        const missed = members.filter((m) => !submittedUserIds.has(m.id));

        // Aggregate all blockers
        const allBlockers: string[] = [];
        for (const s of standups) {
          for (const b of s.blockers) {
            if (typeof b === "string" && b.trim()) {
              allBlockers.push(b.trim());
            }
          }
        }
        const uniqueBlockers = [...new Set(allBlockers)];

        // Build digest
        const { html, text } = dailyDigestTemplate({
          teamName,
          dateLabel: formatDateLabel(start),
          submittedCount: standups.length,
          totalMembers: members.length,
          standups,
          missed,
          allBlockers: uniqueBlockers,
        });

        // Send to team managers (for now, all members; later filter by role)
        // NOTE: Schema has no manager/role column yet. We send to first member as proxy.
        const managerEmail = members[0]?.email;
        if (managerEmail) {
          try {
            await sendEmail({
              to: managerEmail,
              subject: `Daily Digest — ${teamName} · ${formatDateLabel(start)}`,
              text,
              html,
            });
            results.push({ team: teamName, emailsSent: 1 });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            results.push({ team: teamName, emailsSent: 0, error: msg });
          }
        } else {
          results.push({
            team: teamName,
            emailsSent: 0,
            error: "No manager email available",
          });
        }
      }

      return NextResponse.json(
        {
          ok: true,
          dateRange: { start: start.toISOString(), end: end.toISOString() },
          results,
        },
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Daily digest cron error:", message);
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 }
    );
  }
}

function mapStatus(status: string): "Recorded" | "Transcribed" | "Summarized" {
  switch (status) {
    case "pending":
      return "Recorded";
    case "processing":
      return "Transcribed";
    case "completed":
      return "Summarized";
    default:
      return "Recorded";
  }
}
