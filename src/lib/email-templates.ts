function baseHtml(body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0B0D17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F9F7F2; }
    .wrapper { max-width: 640px; margin: 0 auto; padding: 32px 24px; }
    .card { background: #1A1D2E; border: 1px solid rgba(42,111,187,0.15); border-radius: 20px; padding: 28px; margin-bottom: 20px; }
    .header { text-align: center; margin-bottom: 28px; }
    .logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 18px; color: #2A6FBB; letter-spacing: -0.3px; }
    .logo-dot { width: 8px; height: 8px; border-radius: 50%; background: #5A7D3F; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px; color: #F9F7F2; line-height: 1.3; }
    h2 { font-size: 16px; font-weight: 600; margin: 24px 0 12px; color: #2A6FBB; }
    h3 { font-size: 14px; font-weight: 600; margin: 16px 0 8px; color: #F9F7F2; }
    p { font-size: 14px; line-height: 1.6; color: rgba(249,247,242,0.75); margin: 0 0 12px; }
    .meta { font-size: 12px; color: #6B7280; margin-bottom: 20px; }
    .standup-item { background: rgba(11,13,23,0.5); border: 1px solid rgba(42,111,187,0.10); border-radius: 14px; padding: 16px; margin-bottom: 12px; }
    .standup-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .avatar { width: 28px; height: 28px; border-radius: 50%; background: rgba(42,111,187,0.20); color: #2A6FBB; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-right: 8px; }
    .name { font-size: 13px; font-weight: 600; color: #F9F7F2; }
    .status { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; }
    .status-recorded { background: rgba(232,99,75,0.12); color: #E8634B; border: 1px solid rgba(232,99,75,0.15); }
    .status-transcribed { background: rgba(42,111,187,0.12); color: #2A6FBB; border: 1px solid rgba(42,111,187,0.15); }
    .status-summarized { background: rgba(90,125,63,0.12); color: #5A7D3F; border: 1px solid rgba(90,125,63,0.15); }
    .summary { font-size: 13px; color: rgba(249,247,242,0.70); line-height: 1.5; }
    .blocker-tag { display: inline-block; font-size: 11px; font-weight: 500; color: #E8634B; background: rgba(232,99,75,0.10); border: 1px solid rgba(232,99,75,0.15); padding: 3px 8px; border-radius: 6px; margin: 4px 4px 0 0; }
    .missed-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(42,111,187,0.08); }
    .missed-item:last-child { border-bottom: none; }
    .missed-name { font-size: 13px; font-weight: 500; color: #F9F7F2; }
    .missed-label { font-size: 11px; color: #E8634B; font-weight: 600; }
    .progress-bar { height: 6px; border-radius: 999px; background: #0B0D17; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; border-radius: 999px; background: #5A7D3F; }
    .btn { display: inline-block; padding: 10px 18px; border-radius: 10px; background: #2A6FBB; color: #fff; font-size: 13px; font-weight: 600; text-decoration: none; margin-top: 8px; }
    .footer { text-align: center; font-size: 12px; color: #6B7280; margin-top: 24px; }
    .divider { height: 1px; background: rgba(42,111,187,0.12); margin: 20px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo"><span class="logo-dot"></span>REMOTE OS</div>
      </div>
      ${body}
    </div>
    <div class="footer">
      REMOTE OS · MEDINA OS · Stark Team<br/>
      <span style="color:#4a4f5e;">Async Video Standups</span>
    </div>
  </div>
</body>
</html>`;
}

export interface DigestStandup {
  id: string;
  userName: string;
  status: "Recorded" | "Transcribed" | "Summarized";
  summary: string;
  blockers: string[];
  durationSeconds?: number;
  createdAt: string;
}

export interface DigestUser {
  id: string;
  name: string;
  email: string;
}

export function dailyDigestTemplate(params: {
  teamName: string;
  dateLabel: string;
  submittedCount: number;
  totalMembers: number;
  standups: DigestStandup[];
  missed: DigestUser[];
  allBlockers: string[];
}): { html: string; text: string } {
  const participationPct =
    params.totalMembers > 0
      ? Math.round((params.submittedCount / params.totalMembers) * 100)
      : 0;

  const standupsHtml = params.standups.length
    ? params.standups
        .map((s) => {
          const statusClass =
            s.status === "Recorded"
              ? "status-recorded"
              : s.status === "Transcribed"
              ? "status-transcribed"
              : "status-summarized";
          const blockersHtml = s.blockers.length
            ? `<div style="margin-top:8px;">${s.blockers
                .map((b) => `<span class="blocker-tag">${escapeHtml(b)}</span>`)
                .join("")}</div>`
            : "";
          return `
            <div class="standup-item">
              <div class="standup-header">
                <div style="display:flex;align-items:center;">
                  <span class="avatar">${initials(s.userName)}</span>
                  <span class="name">${escapeHtml(s.userName)}</span>
                </div>
                <span class="status ${statusClass}">${s.status}</span>
              </div>
              <div class="summary">${escapeHtml(s.summary || "No summary available.")}</div>
              ${blockersHtml}
            </div>
          `;
        })
        .join("")
    : `<p style="color:#6B7280;font-style:italic;">No standups submitted yesterday.</p>`;

  const missedHtml = params.missed.length
    ? params.missed
        .map(
          (m) => `
            <div class="missed-item">
              <span class="avatar">${initials(m.name)}</span>
              <div>
                <div class="missed-name">${escapeHtml(m.name)}</div>
                <div class="missed-label">No standup submitted</div>
              </div>
            </div>
          `
        )
        .join("")
    : `<p style="color:#6B7280;font-style:italic;">Everyone submitted — great work!</p>`;

  const blockersHtml = params.allBlockers.length
    ? `<div style="margin-top:8px;">${params.allBlockers
        .map((b) => `<span class="blocker-tag">${escapeHtml(b)}</span>`)
        .join("")}</div>`
    : `<p style="color:#6B7280;font-style:italic;">No blockers reported yesterday.</p>`;

  const html = baseHtml(
    `
      <h1>Daily Digest · ${escapeHtml(params.teamName)}</h1>
      <div class="meta">${params.dateLabel} · ${params.submittedCount}/${params.totalMembers} team members submitted</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${participationPct}%;"></div>
      </div>

      <div class="divider"></div>

      <h2>Submitted Standups</h2>
      ${standupsHtml}

      <h2>Missed Standups</h2>
      ${missedHtml}

      <h2>Key Blockers</h2>
      ${blockersHtml}

      <div class="divider"></div>
      <p style="text-align:center;">
        <a href="${process.env.NEXTAUTH_URL ?? `http://localhost:${process.env.PORT || "3535"}`}" class="btn">Open Dashboard</a>
      </p>
    `,
    `Daily Digest — ${params.teamName}`
  );

  const text =
    `Daily Digest — ${params.teamName}\n` +
    `${params.dateLabel}\n` +
    `Participation: ${params.submittedCount}/${params.totalMembers} (${participationPct}%)\n\n` +
    `SUBMITTED STANDUPS\n` +
    params.standups
      .map(
        (s) =>
          `- ${s.userName} [${s.status}]\n  ${s.summary || "No summary"}\n  Blockers: ${
            s.blockers.join(", ") || "None"
          }`
      )
      .join("\n\n") || "No standups submitted." +
    `\n\nMISSED STANDUPS\n` +
    params.missed.map((m) => `- ${m.name} (${m.email})`).join("\n") || "None — everyone submitted!" +
    `\n\nKEY BLOCKERS\n` +
    (params.allBlockers.join("\n") || "No blockers reported.") +
    `\n\nOpen dashboard: ${process.env.NEXTAUTH_URL ?? `http://localhost:${process.env.PORT || "3535"}`}`;

  return { html, text };
}

export function reminderTemplate(params: {
  userName: string;
  teamName?: string;
}): { html: string; text: string } {
  const html = baseHtml(
    `
      <h1>Hey ${escapeHtml(params.userName)}, time for your standup!</h1>
      <p>You haven't submitted your daily standup yet. It takes 90 seconds and keeps the whole team in sync — no meetings required.</p>
      <p style="text-align:center;">
        <a href="${process.env.NEXTAUTH_URL ?? `http://localhost:${process.env.PORT || "3535"}`}" class="btn">Record Standup</a>
      </p>
      ${
        params.teamName
          ? `<p style="text-align:center;color:#6B7280;font-size:12px;margin-top:12px;">Team: ${escapeHtml(params.teamName)}</p>`
          : ""
      }
    `,
    "Reminder: Submit Your Daily Standup"
  );

  const text =
    `Hey ${params.userName}, time for your standup!\n\n` +
    `You haven't submitted your daily standup yet. It takes 90 seconds and keeps the whole team in sync.\n\n` +
    `Record now: ${process.env.NEXTAUTH_URL ?? `http://localhost:${process.env.PORT || "3535"}`}\n` +
    (params.teamName ? `Team: ${params.teamName}` : "");

  return { html, text };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
