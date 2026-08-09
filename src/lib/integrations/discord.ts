export interface DiscordCredentials {
  webhookUrl: string;
  username?: string;
}

export async function postDiscordWebhook(
  webhookUrl: string,
  payload: {
    content?: string;
    username?: string;
    embeds?: unknown[];
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
