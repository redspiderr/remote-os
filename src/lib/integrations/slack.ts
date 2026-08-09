export interface SlackCredentials {
  accessToken: string;
  botUserId?: string;
  teamName?: string;
  channel?: string;
}

export async function postSlackMessage(
  webhookUrl: string,
  payload: {
    text: string;
    blocks?: unknown[];
    channel?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text };
  }
  return { ok: true };
}

export async function slackBotPost(
  accessToken: string,
  channel: string,
  payload: { text: string; blocks?: unknown[] }
): Promise<{ ok: boolean; error?: string; ts?: string }> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, ...payload }),
  });
  const data = await res.json() as { ok: boolean; error?: string; ts?: string };
  return data;
}
