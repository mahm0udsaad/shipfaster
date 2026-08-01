import { describe, it, expect } from 'vitest';
import {
  buildMonthGrid,
  dayKey,
  fromLocalInputValue,
  monthFetchRange,
  monthKey,
  moveToDay,
  parseMonthKey,
  shiftMonth,
  toLocalInputValue,
} from '../src/lib/calendar';

describe('month grid', () => {
  it('starts on the Monday on or before the 1st and always spans 6 weeks', () => {
    const grid = buildMonthGrid(2026, 7); // August 2026 — the 1st is a Saturday
    expect(grid).toHaveLength(42);
    expect(grid[0]!.getDay()).toBe(1);
    expect(dayKey(grid[0]!)).toBe('2026-07-27');
    expect(dayKey(grid[41]!)).toBe('2026-09-06');
  });

  it('counts days from the grid start, not the requested month', () => {
    // February 2027 starts on a Monday: no leading days, so an off-by-a-month bug hides here.
    // March 2026 starts on a Sunday, the worst case — six leading days from February.
    const march = buildMonthGrid(2026, 2);
    expect(dayKey(march[0]!)).toBe('2026-02-23');
    expect(dayKey(march[6]!)).toBe('2026-03-01');
  });

  it('rolls across a year boundary', () => {
    const jan = buildMonthGrid(2027, 0);
    expect(dayKey(jan[0]!)).toBe('2026-12-28');
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('month key', () => {
  it('round-trips', () => {
    expect(monthKey(2026, 7)).toBe('2026-08');
    expect(parseMonthKey('2026-08')).toEqual({ year: 2026, month: 7 });
  });

  it('falls back to the current month rather than throwing on junk', () => {
    const now = new Date(2026, 4, 9);
    expect(parseMonthKey(undefined, now)).toEqual({ year: 2026, month: 4 });
    expect(parseMonthKey('not-a-month', now)).toEqual({ year: 2026, month: 4 });
    expect(parseMonthKey('2026-13', now)).toEqual({ year: 2026, month: 4 });
  });
});

describe('fetch window', () => {
  it('pads either side of the month so grid edges and timezone skew stay covered', () => {
    const { fromIso, toIso } = monthFetchRange(2026, 7);
    expect(fromIso).toBe('2026-07-24T00:00:00.000Z');
    expect(toIso).toBe('2026-09-09T00:00:00.000Z');
  });
});

describe('slot editing', () => {
  it('datetime-local round-trips through the local timezone', () => {
    const local = '2026-08-04T18:30';
    const iso = fromLocalInputValue(local);
    expect(toLocalInputValue(iso)).toBe(local);
  });

  it('a drag keeps the clock time and only changes the day', () => {
    const iso = fromLocalInputValue('2026-08-04T18:30');
    const moved = new Date(moveToDay(iso, new Date(2026, 7, 11)));
    expect(dayKey(moved)).toBe('2026-08-11');
    expect(moved.getHours()).toBe(18);
    expect(moved.getMinutes()).toBe(30);
  });
});
