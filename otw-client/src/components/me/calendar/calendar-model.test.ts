import { describe, expect, it } from 'vitest';
import type { MyRoomDto } from '@/lib/api/me';
import {
  addMonths,
  dayNum,
  eventsOnDay,
  layoutWeek,
  monthWeeks,
  parseIso,
  parts,
  rangeLabel,
  toEvents,
  weekStartOf,
} from './calendar-model';

const room = (title: string, startDate: string | null, endDate: string | null = null): MyRoomDto => ({
  roomId: title,
  roomCode: 'ABCDEFGH',
  title,
  destination: 'Somewhere',
  startDate,
  endDate,
  type: 'GROUP',
  status: 'ACTIVE',
  phase: 'PLANNING',
  myRole: 'MEMBER',
  memberCount: 3,
});

describe('day numbers', () => {
  it('round-trips and knows the weekday', () => {
    expect(parts(dayNum(2026, 11, 14))).toEqual({ y: 2026, m: 11, d: 14, dow: 6 }); // Saturday
    expect(parseIso('2026-11-14')).toBe(dayNum(2026, 11, 14));
    expect(parseIso(null)).toBeNull();
    expect(parseIso('nope')).toBeNull();
  });

  it('adds months and finds the Sunday of a week', () => {
    expect(addMonths(dayNum(2026, 12, 20), 1)).toBe(dayNum(2027, 1, 1));
    expect(addMonths(dayNum(2026, 1, 20), -1)).toBe(dayNum(2025, 12, 1));
    expect(parts(weekStartOf(dayNum(2026, 11, 14)))).toMatchObject({ m: 11, d: 8, dow: 0 });
  });
});

describe('monthWeeks', () => {
  it('covers November 2026 in 5 full Sunday-first weeks', () => {
    const weeks = monthWeeks(2026, 11);
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(parts(weeks[0][0])).toMatchObject({ m: 11, d: 1, dow: 0 });
    expect(parts(weeks[4][6])).toMatchObject({ m: 12, d: 5 });
  });
});

describe('toEvents', () => {
  it('places dated galas, treats a missing end as one day, and counts undated ones', () => {
    const { events, undated } = toEvents([
      { group: 'upcoming', rooms: [room('A', '2026-11-14', '2026-11-16'), room('B', '2026-11-20'), room('C', null)] },
    ]);
    expect(undated).toBe(1);
    expect(events.map((e) => [e.room.title, e.end - e.start])).toEqual([
      ['A', 2],
      ['B', 0],
    ]);
  });
});

describe('layoutWeek', () => {
  it('draws a multi-day gala as one pill and stacks overlaps on lanes', () => {
    const { events } = toEvents([
      { group: 'upcoming', rooms: [room('Long', '2026-11-09', '2026-11-12'), room('Short', '2026-11-10'), room('Third', '2026-11-10')] },
    ]);
    const weekStart = dayNum(2026, 11, 8);
    const { segments, hidden } = layoutWeek(weekStart, events, 2);
    const long = segments.find((s) => s.event.room.title === 'Long')!;
    expect(long).toMatchObject({ col: 1, span: 4, lane: 0, startsHere: true, endsHere: true });
    expect(segments).toHaveLength(2);
    expect(hidden[2]).toBe(1); // "Third" didn't fit in two lanes on Tuesday
  });

  it('marks a gala that continues past the week as not ending here', () => {
    const { events } = toEvents([{ group: 'ongoing', rooms: [room('Trip', '2026-11-12', '2026-11-18')] }]);
    const { segments } = layoutWeek(dayNum(2026, 11, 8), events, 2);
    expect(segments[0]).toMatchObject({ col: 4, span: 3, startsHere: true, endsHere: false });
  });
});

describe('helpers', () => {
  it('finds the galas on a day and labels ranges', () => {
    const { events } = toEvents([{ group: 'upcoming', rooms: [room('A', '2026-11-14', '2026-11-16')] }]);
    expect(eventsOnDay(events, dayNum(2026, 11, 15))).toHaveLength(1);
    expect(eventsOnDay(events, dayNum(2026, 11, 17))).toHaveLength(0);
    expect(rangeLabel(dayNum(2026, 11, 14), dayNum(2026, 11, 16))).toBe('Nov 14–16');
    expect(rangeLabel(dayNum(2026, 11, 30), dayNum(2026, 12, 2))).toBe('Nov 30–Dec 2');
  });
});
