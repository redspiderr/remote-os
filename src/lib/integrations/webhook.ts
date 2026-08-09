export interface WebhookPayload {
  event: string;
  payload: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}

export async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<{ ok: boolean; error?: string }> {
  let body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-RemoteOS-Event": payload.event,
  };
  if (secret) {
    const { createHmac } = await import("crypto");
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    headers["X-RemoteOS-Signature"] = `sha256=${sig}`;
  }
  try {
    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: (err as Error).message };
  }
}
