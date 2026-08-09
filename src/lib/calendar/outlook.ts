import { decryptToken } from "./token";

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  showAs: string;
}

export async function listOutlookEvents(
  encryptedAccessToken: string,
  startDateTime: string,
  endDateTime: string
): Promise<OutlookCalendarEvent[]> {
  const accessToken = decryptToken(encryptedAccessToken);
  const url = new URL(
    "https://graph.microsoft.com/v1.0/me/calendarview"
  );
  url.searchParams.set("startDateTime", startDateTime);
  url.searchParams.set("endDateTime", endDateTime);
  url.searchParams.set("$select", "id,subject,bodyPreview,start,end,showAs");
  url.searchParams.set("$orderby", "start/dateTime");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Outlook Calendar API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return (data.value ?? []) as OutlookCalendarEvent[];
}

export async function getOutlookFreeBusy(
  encryptedAccessToken: string,
  startDateTime: string,
  endDateTime: string
): Promise<{ start: string; end: string }[]> {
  const accessToken = decryptToken(encryptedAccessToken);
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/calendar/getSchedule",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: 'outlook.timezone="UTC"',
      },
      body: JSON.stringify({
        schedules: ["me"],
        startTime: { dateTime: startDateTime, timeZone: "UTC" },
        endTime: { dateTime: endDateTime, timeZone: "UTC" },
        availabilityViewInterval: 15,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Outlook getSchedule error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const schedule = data.value?.[0];
  const items = schedule?.scheduleItems ?? [];
  return items
    .filter((item: Record<string, unknown>) => item.status === "busy")
    .map((item: Record<string, unknown>) => ({
      start: (item.start as Record<string, string>).dateTime as string,
      end: (item.end as Record<string, string>).dateTime as string,
    }));
}

export async function createOutlookEvent(
  encryptedAccessToken: string,
  payload: {
    subject: string;
    body?: { contentType: "HTML" | "text"; content: string };
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  }
): Promise<{ id: string; webLink: string }> {
  const accessToken = decryptToken(encryptedAccessToken);
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/events",
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
    throw new Error(`Outlook create event error: ${res.status} ${text}`);
  }

  return (await res.json()) as { id: string; webLink: string };
}

export async function refreshOutlookToken(
  refreshToken: string
): Promise<{ access_token: string; expires_at: number }> {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing Outlook OAuth credentials");
  }

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/Calendars.Read",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Outlook token refresh error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const expiresAt = Date.now() + (data.expires_in as number) * 1000;
  return {
    access_token: data.access_token as string,
    expires_at: expiresAt,
  };
}
