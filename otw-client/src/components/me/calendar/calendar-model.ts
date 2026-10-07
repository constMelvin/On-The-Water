/**
 * Pure date + layout maths for the My Galas calendar (no React). Dates are plain yyyy-mm-dd, so everything
 * works on integer "day numbers" (days since 1970-01-01, UTC): spans, today and week maths are exact and
 * immune to timezones and DST. Weeks start on Sunday, like the reference.
 */
import type { MyRoomDto } from '@/lib/api/me';

export type CalGroup = 'ongoing' | 'upcoming' | 'done';

export interface CalEvent {
  room: MyRoomDto;
  group: CalGroup;
  /** First day (day number). */
  start: number;
  /** Last day, inclusive (= start for a one-day gala). */
  end: number;
}

/** Day number for a calendar date (month is 1-12; overflowing months and days roll over). */
export const dayNum = (y: number, m: number, d: number): number => Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);

/** Day number of a yyyy-mm-dd string, or null when it isn't a usable date. */
export function parseIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? dayNum(y, m, d) : null;
}

export interface DayParts {
  y: number;
  /** 1-12. */
  m: number;
  d: number;
  /** 0 = Sunday. */
  dow: number;
}

export function parts(n: number): DayParts {
  const dt = new Date(n * 86_400_000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), dow: dt.getUTCDay() };
}

/** Today's local date as a day number. */
export function todayNum(now = new Date()): number {
  return dayNum(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** The Sunday on or before `n`. */
export const weekStartOf = (n: number): number => n - parts(n).dow;

/** The first day of the month that is `delta` months from the month of `n`. */
export function addMonths(n: number, delta: number): number {
  const { y, m } = parts(n);
  return dayNum(y, m + delta, 1);
}

/** Splits galas into events. Galas without a start date can't be placed and are only counted. */
export function toEvents(groups: { group: CalGroup; rooms: MyRoomDto[] }[]): { events: CalEvent[]; undated: number } {
  const events: CalEvent[] = [];
  let undated = 0;
  for (const { group, rooms } of groups) {
    for (const room of rooms) {
      const start = parseIso(room.startDate);
      if (start === null) {
        undated++;
        continue;
      }
      const end = parseIso(room.endDate);
      events.push({ room, group, start, end: end === null ? start : Math.max(start, end) });
    }
  }
  events.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start) || a.room.title.localeCompare(b.room.title));
  return { events, undated };
}

/** The weeks (arrays of 7 day numbers) covering a month, including the dimmed days of the neighbouring months. */
export function monthWeeks(y: number, m: number): number[][] {
  const first = dayNum(y, m, 1);
  const dim = parts(dayNum(y, m + 1, 0)).d;
  const start = weekStartOf(first);
  const count = Math.ceil((parts(first).dow + dim) / 7);
  return Array.from({ length: count }, (_, w) => Array.from({ length: 7 }, (_, i) => start + w * 7 + i));
}

export interface Segment {
  event: CalEvent;
  /** 0-6, the column the segment starts in. */
  col: number;
  span: number;
  lane: number;
  /** True when the gala really starts / ends in this week (round cap), false when it continues past the edge. */
  startsHere: boolean;
  endsHere: boolean;
}

export interface WeekLayout {
  /** Segments in the visible lanes. */
  segments: Segment[];
  /** For each of the 7 days, how many galas didn't fit in the visible lanes. */
  hidden: number[];
}

/**
 * Places the galas that touch one week on lanes (greedy: earliest start first, longer first), so a gala that
 * spans several days is one continuous pill. Only `maxLanes` lanes are returned; the rest are counted per day.
 */
export function layoutWeek(weekStart: number, events: CalEvent[], maxLanes: number): WeekLayout {
  const weekEnd = weekStart + 6;
  const lanes: number[][] = []; // per lane: the columns it already uses
  const segments: Segment[] = [];
  const hidden = [0, 0, 0, 0, 0, 0, 0];

  for (const event of events) {
    if (event.start > weekEnd || event.end < weekStart) continue;
    const col = Math.max(event.start, weekStart) - weekStart;
    const last = Math.min(event.end, weekEnd) - weekStart;
    let lane = lanes.findIndex((used) => used.every((c) => c < col || c > last));
    if (lane === -1) {
      lane = lanes.length;
      lanes.push([]);
    }
    for (let c = col; c <= last; c++) lanes[lane].push(c);
    if (lane < maxLanes) {
      segments.push({
        event,
        col,
        span: last - col + 1,
        lane,
        startsHere: event.start >= weekStart,
        endsHere: event.end <= weekEnd,
      });
    } else {
      for (let c = col; c <= last; c++) hidden[c]++;
    }
  }
  return { segments, hidden };
}

/** Galas on one day, in the same order as the list. */
export const eventsOnDay = (events: CalEvent[], n: number): CalEvent[] => events.filter((e) => e.start <= n && e.end >= n);

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const monthName = (m: number): string => MONTH[m - 1];
export const dowLabel = (dow: number): string => DOW[dow];

/** "Nov 14", "Nov 14-16" or "Nov 30-Dec 2". */
export function rangeLabel(start: number, end: number): string {
  const a = parts(start);
  if (end === start) return `${MON[a.m - 1]} ${a.d}`;
  const b = parts(end);
  return a.m === b.m && a.y === b.y ? `${MON[a.m - 1]} ${a.d}–${b.d}` : `${MON[a.m - 1]} ${a.d}–${MON[b.m - 1]} ${b.d}`;
}

/** "Sat, Nov 14" */
export function dayLabel(n: number): string {
  const p = parts(n);
  return `${DOW[p.dow]}, ${MON[p.m - 1]} ${p.d}`;
}
