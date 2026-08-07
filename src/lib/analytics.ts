// ─── Admin Analytics Helpers ────────────────────────────────────────
// Finance & Analytics Lead — TYRION (Lannister Team)

export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfWeek(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfMonth(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysBack(n: number, d: Date = new Date()): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - n);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function toISOUTC(d: Date): string {
  return d.toISOString();
}

export function clampPercent(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

export const DATE_RANGES: Record<string, DateRange> = {
  today: { from: startOfDay(), to: new Date(), label: 'Today' },
  week: { from: startOfWeek(), to: new Date(), label: 'This Week' },
  month: { from: startOfMonth(), to: new Date(), label: 'This Month' },
  last7: { from: daysBack(6), to: new Date(), label: 'Last 7 Days' },
  last30: { from: daysBack(29), to: new Date(), label: 'Last 30 Days' },
  all: { from: new Date('2000-01-01'), to: new Date(), label: 'All Time' },
};

export function fillDailyGaps(
  rows: { date: string; value: number }[],
  range: DateRange
): { date: string; value: number }[] {
  const map = new Map<string, number>();
  rows.forEach((r) => map.set(r.date, r.value));

  const result: { date: string; value: number }[] = [];
  const cursor = new Date(range.from);
  const end = new Date(range.to);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({ date: key, value: map.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
