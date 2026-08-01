/**
 * Pure month-grid math for the content calendar. No DB, no React — so the awkward parts
 * (month rollover, week alignment, the days either side of the month that the grid still
 * shows) are unit-testable on their own.
 *
 * Timezone rule: the SERVER only ever computes a fetch *window*, deliberately padded, and
 * the CLIENT does all day-bucketing in the viewer's local time. A post scheduled 23:00 on
 * the 31st must land on the 31st for the person looking at it, not for the server's TZ.
 */

export type MonthKey = `${number}-${string}`;   // 'YYYY-MM'

/** 'YYYY-MM' → {year, month} (month is 0-indexed, as Date wants it). Invalid input → now. */
export function parseMonthKey(key: string | undefined | null, now = new Date()) {
  const m = /^(\d{4})-(\d{2})$/.exec(key ?? '');
  if (!m) return { year: now.getFullYear(), month: now.getMonth() };
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  if (month < 0 || month > 11) return { year: now.getFullYear(), month: now.getMonth() };
  return { year, month };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** The month before/after, rolling the year over. */
export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/**
 * The instants to fetch for a month view. Padded by a week on each side to cover both the
 * grid's leading/trailing days and any offset between the server's clock and the viewer's.
 * Over-fetching a fortnight of posts is cheaper than a post vanishing from an edge cell.
 */
export function monthFetchRange(year: number, month: number, padDays = 8) {
  const from = new Date(Date.UTC(year, month, 1));
  from.setUTCDate(from.getUTCDate() - padDays);
  const to = new Date(Date.UTC(year, month + 1, 1));
  to.setUTCDate(to.getUTCDate() + padDays);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

/**
 * 42 local dates (6 weeks × 7 days) covering the month, starting on Monday. Fixed at 6 rows
 * so the grid does not change height as you page through months.
 */
export function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;          // Mon=0 … Sun=6
  const start = new Date(year, month, 1 - offset);
  // Count from `start`'s own month, not the requested one: when the grid starts in the
  // previous month, `new Date(year, month, start.getDate() + i)` would silently land a week
  // late. Date normalizes the day overflow across month and year boundaries for us.
  return Array.from(
    { length: 42 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

/** Local-time day bucket key, 'YYYY-MM-DD'. The one place day identity is defined. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

/** ISO instant → the value an <input type="datetime-local"> expects, in local time. */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** …and back. `new Date('2026-08-04T10:00')` is parsed as local time, which is what we want. */
export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

/** Same clock time, different day — what a drag from one cell to another means. */
export function moveToDay(iso: string, day: Date): string {
  const at = new Date(iso);
  const moved = new Date(day.getFullYear(), day.getMonth(), day.getDate(), at.getHours(), at.getMinutes());
  return moved.toISOString();
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
