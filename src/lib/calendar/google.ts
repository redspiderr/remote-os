import { decryptToken } from "./token";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status: string;
}

export async function listGoogleEvents(
  encryptedAccessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const accessToken = decryptToken(encryptedAccessToken);
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return (data.items ?? []) as GoogleCalendarEvent[];
}

export async function getGoogleFreeBusy(
  encryptedAccessToken: string,
  timeMin: string,
  timeMax: string
): Promise<{ start: string; end: string }[]> {
  const accessToken = decryptToken(encryptedAccessToken);
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google freeBusy error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const cal = data.calendars?.primary?.busy ?? [];
  return cal as { start: string; end: string }[];
}

export async function createGoogleEvent(
  encryptedAccessToken: string,
  payload: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
  }
): Promise<{ id: string; htmlLink: string }> {
  const accessToken = decryptToken(encryptedAccessToken);
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google create event error: ${res.status} ${text}`);
  }

  return (await res.json()) as { id: string; htmlLink: string };
}

export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ access_token: string; expires_at: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const expiresAt = Date.now() + (data.expires_in as number) * 1000;
  return {
    access_token: data.access_token as string,
    expires_at: expiresAt,
  };
}
