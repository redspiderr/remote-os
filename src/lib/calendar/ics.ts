import { ICalCalendar, ICalEventStatus } from "ical-generator";

export function generateICS(events: {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  status?: string;
}[]): string {
  const cal = new ICalCalendar({ name: "REMOTE OS Calendar" });

  for (const ev of events) {
    cal.createEvent({
      id: ev.id,
      summary: ev.title,
      description: ev.description ?? "",
      start: ev.startTime,
      end: ev.endTime,
      status: ev.status === "cancelled" ? ICalEventStatus.CANCELLED : ICalEventStatus.CONFIRMED,
    });
  }

  return cal.toString();
}
