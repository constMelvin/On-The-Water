/**
 * OTW mock data + helpers. Ported from reference/otw/src/data.js and proto1.js.
 *
 * Field keys match the reference exactly (n, c, s, on...) so later screens can be
 * ported 1:1. Each type documents what the short keys mean. To move to a real API,
 * keep these types as the view model and map the API response into them.
 */
import type { GalaRecord } from './gala-registry';

/** Brand tones a member or photo can be colored with. */
export type Tone = 'rosy' | 'teal' | 'zest' | 'blossom';

/** Attendance: g = I'm G (going), m = maybe, x = can't make it. */
export type AttendanceKey = 'g' | 'm' | 'x';

/** Live location status on gala day. */
export type LocationKey = 'home' | 'otw' | 'almost' | 'there';

export interface Gala {
  title: string;
  code: string;
  /** Gala password (mock only). */
  pw: string;
  dest: string;
  date: string;
  range: string;
  time: string;
  /** Real start (yyyy-mm-dd + hh:mm) for the live countdown. Absent on the demo gala. */
  dateISO?: string;
  startTime?: string;
  days?: number;
}

export interface Member {
  /** Display name. */
  n: string;
  /** Avatar tone. */
  c: Tone;
  /** Attendance status. */
  s: AttendanceKey;
  /** 1 when online right now. */
  on: 0 | 1;
}

export interface StatusMeta {
  /** Label on the choice button. */
  l: string;
  /** Label on the badge. */
  b: string;
  /** CSS class for the tag. */
  cls: 'st-g' | 'st-m' | 'st-x';
  /** Icon name. */
  i: 'check' | 'clock' | 'x';
}

export interface LocationMeta {
  l: string;
  cls: 'l-home' | 'l-otw' | 'l-almost' | 'l-there';
}

export interface Stop {
  /** Place. */
  p: string;
  /** Activity type. */
  a: string;
  /** Time. */
  t: string;
  /** Note. */
  n: string;
  /** Added by (member name). */
  w: string;
}

export interface ChecklistItem {
  /** Item text. */
  t: string;
  /** Assigned to (member name, '' = nobody yet). */
  w: string;
  /** 1 when packed. */
  d: 0 | 1;
}

export interface Expense {
  /** Name. */
  n: string;
  /** Category. */
  c: string;
  /** Amount in pesos. */
  a: number;
  /** Paid by (member name). */
  w: string;
  /** Date label. */
  d: string;
  note: string;
}

/** Budget estimate per category (pesos) plus the number of people splitting it. */
export interface Budget {
  /** Transportation. */
  tr: number;
  /** Stay. */
  st: number;
  /** Food. */
  fo: number;
  /** Activities. */
  ac: number;
  /** Other. */
  ot: number;
  /** Number of people. */
  n: number;
}

/* ---------- sample gala ---------- */

/** The current user in the mock (the gala leader). */
export const ME = 'Merylle';

/** Fixed demo clock (Sep 29, 2026 · 9:41 AM) to the gala start. */
export const NOW_TO_GALA = { d: 45, h: 20, m: 19 };

export const G: Gala = {
  title: 'Baguio Before Graduation',
  code: 'OTW-7K2P',
  pw: 'baguio2026',
  dest: 'Baguio City',
  date: 'Sat, Nov 14',
  range: 'Nov 14–15, 2026',
  time: '5:30 AM – 9:00 PM',
};

export const MEM: Member[] = [
  { n: 'Merylle', c: 'rosy', s: 'g', on: 1 },
  { n: 'CJ', c: 'teal', s: 'g', on: 1 },
  { n: 'Josh', c: 'zest', s: 'g', on: 0 },
  { n: 'Alex', c: 'blossom', s: 'g', on: 1 },
  { n: 'Sam', c: 'teal', s: 'g', on: 1 },
  { n: 'Jamie', c: 'rosy', s: 'g', on: 0 },
  { n: 'Bea', c: 'zest', s: 'g', on: 1 },
  { n: 'Migs', c: 'blossom', s: 'm', on: 0 },
  { n: 'Tin', c: 'teal', s: 'm', on: 0 },
  { n: 'Paolo', c: 'rosy', s: 'x', on: 0 },
];

/** The 8 people splitting costs. */
export const SHARERS = ['Merylle', 'CJ', 'Josh', 'Alex', 'Sam', 'Jamie', 'Bea', 'Migs'];

export const ST: Record<AttendanceKey, StatusMeta> = {
  g: { l: "I'm G", b: 'Going', cls: 'st-g', i: 'check' },
  m: { l: 'Maybe', b: 'Maybe', cls: 'st-m', i: 'clock' },
  x: { l: "Can't make it", b: "Can't make it", cls: 'st-x', i: 'x' },
};

export const LOC: Record<LocationKey, LocationMeta> = {
  home: { l: 'Still at home', cls: 'l-home' },
  otw: { l: 'On the way', cls: 'l-otw' },
  almost: { l: 'Almost there', cls: 'l-almost' },
  there: { l: 'Already there', cls: 'l-there' },
};

export const STOPS0: Stop[] = [
  { p: 'Cubao bus terminal', a: 'Meet-up', t: '5:30 AM', n: 'Be there 30 minutes early. Bring water.', w: 'Merylle' },
  { p: 'Strawberry Farm, La Trinidad', a: 'Activity', t: '10:30 AM', n: 'Pick-your-own. Bring cash.', w: 'CJ' },
  { p: 'Session Road lunch', a: 'Food', t: '12:30 PM', n: 'Vote on where to eat in the chat.', w: 'Jamie' },
  { p: 'Burnham Park boats', a: 'Activity', t: '3:00 PM', n: '', w: 'Sam' },
  { p: 'Night market', a: 'Food', t: '6:30 PM', n: 'Street food + ukay.', w: 'Bea' },
];

export const ITEMS0: ChecklistItem[] = [
  { t: 'Power bank', w: 'Merylle', d: 1 },
  { t: 'Snacks', w: 'CJ', d: 0 },
  { t: 'Extra shirt', w: 'Josh', d: 0 },
  { t: 'Jacket for Baguio', w: 'Alex', d: 1 },
  { t: 'Sunscreen', w: 'Sam', d: 0 },
  { t: 'Portable speaker', w: 'Jamie', d: 1 },
  { t: 'Cash for the market', w: '', d: 0 },
];

export const EXP0: Expense[] = [
  { n: 'Bus tickets (round trip)', c: 'Transportation', a: 4800, w: 'CJ', d: 'Sep 20', note: 'Booked for all 8' },
  { n: 'Airbnb deposit', c: 'Stay', a: 3200, w: 'Merylle', d: 'Sep 24', note: '' },
  { n: 'Strawberry Farm booking', c: 'Activities', a: 1120, w: 'Josh', d: 'Sep 27', note: '' },
];

/**
 * DEV FALLBACK ONLY: the demo gala as a registry record, so /gala/OTW-7K2P works in
 * development without creating a gala first. Production never seeds this.
 */
export const demoGalaRecord = (): GalaRecord => ({
  code: G.code,
  title: G.title,
  date: '2026-11-14',
  days: 2,
  startTime: '05:30',
  endTime: '21:00',
  destination: G.dest,
  password: G.pw,
  members: MEM.map((m, i) => ({ name: m.n, role: i === 0 ? 'leader' : 'member', status: m.s, color: m.c })),
  createdAt: 0,
  demo: true,
});

/** Starting budget estimate (the prototype's initial `S.bud`). */
export const BUD0: Budget = { tr: 5600, st: 6400, fo: 4800, ac: 2000, ot: 800, n: 8 };

/* ---------- helpers ---------- */

/** Formats pesos, e.g. 2450 -> "₱2,450". */
export const peso = (n: number): string => '₱' + Math.round(n).toLocaleString('en-US');

/** A member's attendance, using the live choice for the current user. */
export const statusOf = (m: Member, myStatus: AttendanceKey, me = ME): AttendanceKey => (m.n === me ? myStatus : m.s);

/** Photos in the Gala Dump for the mock, by phase (reference photoCount without uploads). */
export const photoCountFor = (phase: 'planning' | 'day' | 'done'): number =>
  phase === 'planning' ? 0 : phase === 'day' ? 6 : 12;

/** Looks up a member by name; unknown names get a blossom placeholder. */
export const byName = (n: string): Member =>
  MEM.find((m) => m.n === n) ?? { n: n || '?', c: 'blossom', s: 'm', on: 0 };

/**
 * Attendance totals. The current user ("Merylle" in the mock) counts with their
 * live choice `myStatus` instead of the stored one, like the prototype.
 */
export const counts = (
  members: Member[] = MEM,
  myStatus?: AttendanceKey,
  me = ME
): Record<AttendanceKey, number> => {
  const c: Record<AttendanceKey, number> = { g: 0, m: 0, x: 0 };
  members.forEach((m) => {
    c[m.n === me && myStatus ? myStatus : m.s]++;
  });
  return c;
};

/** Estimated total of every budget category. */
export const budTotal = (b: Budget = BUD0): number => b.tr + b.st + b.fo + b.ac + b.ot;

/** Total actually spent so far. */
export const spent = (expenses: Expense[] = EXP0): number => expenses.reduce((a, e) => a + e.a, 0);
