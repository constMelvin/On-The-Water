/**
 * Shared gala store used by Plan a Gala, Join a Gala, Enter a Gala and the dashboard.
 *
 * The teammates' flows only had mock APIs + sessionStorage, so this is the single place
 * that remembers a gala on this device:
 *   - localStorage  "otw:galas"         -> { [CODE]: GalaRecord }
 *   - sessionStorage + localStorage "otw:me:<CODE>" -> CurrentMember
 *     (sessionStorage first, so two tabs can be two different people; localStorage keeps
 *      the last identity for a fresh tab / after the browser restarts)
 *
 * TODO(team): when the real API exists, replace the bodies of getGala / saveGala / addMember /
 * setMemberStatus with API calls. Keep the function signatures and the dashboard keeps working.
 */
import type { AttendanceKey, Tone } from './data';

export type GalaRole = 'leader' | 'member';

export interface MemberRecord {
  name: string;
  role: GalaRole;
  status: AttendanceKey;
  color: Tone;
}

export interface GalaRecord {
  code: string;
  title: string;
  /** yyyy-mm-dd */
  date: string;
  /** Number of days (1 for a day tour). */
  days: number;
  /** hh:mm, optional */
  startTime?: string;
  endTime?: string;
  destination: string;
  /**
   * MOCK ONLY: kept on this device so "Enter a Gala" can check it.
   * TODO(team): never store this client-side once the real API verifies it server-side.
   */
  password?: string;
  members: MemberRecord[];
  createdAt: number;
  /** Seeded from the demo data module (dev fallback), not created by a real flow. */
  demo?: boolean;
}

export interface CurrentMember {
  name: string;
  role: GalaRole;
}

const GALAS_KEY = 'otw:galas';
const meKey = (code: string) => `otw:me:${normCode(code)}`;
const TONES: Tone[] = ['rosy', 'teal', 'zest', 'blossom'];

/** Same shape the Join page uses: OTW-XXXX, upper case. */
export const normCode = (code: string) => code.trim().toUpperCase();
export const isValidCode = (code: string) => /^OTW-[A-Z0-9]{4}$/.test(normCode(code));
export const galaRoute = (code: string) => `/gala/${encodeURIComponent(normCode(code))}`;

/* ---------------- storage helpers (never throw) ---------------- */

function readJSON<T>(store: Storage | undefined, key: string): T | null {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/* Same-tab change notifications (the browser's storage event only fires in OTHER tabs). */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function writeJSON(store: Storage | undefined, key: string, value: unknown) {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the flow still works for this page view */
  }
  emit();
}

const local = () => (typeof window === 'undefined' ? undefined : window.localStorage);
const session = () => (typeof window === 'undefined' ? undefined : window.sessionStorage);

function allGalas(): Record<string, GalaRecord> {
  return readJSON<Record<string, GalaRecord>>(local(), GALAS_KEY) ?? {};
}

/* ---------------- galas ---------------- */

export function getGala(code: string): GalaRecord | null {
  return allGalas()[normCode(code)] ?? null;
}

export function saveGala(record: GalaRecord): GalaRecord {
  const galas = allGalas();
  const rec = { ...record, code: normCode(record.code) };
  galas[rec.code] = rec;
  writeJSON(local(), GALAS_KEY, galas);
  return rec;
}

/** Called by Plan a Gala after the gala is created. The creator becomes the Gala Leader. */
export function registerCreatedGala(input: {
  code: string;
  title: string;
  date: string;
  days: number;
  startTime?: string;
  endTime?: string;
  destination: string;
  password?: string;
  leaderName?: string;
}): GalaRecord {
  const leaderName = input.leaderName?.trim() || 'Gala Leader';
  const rec = saveGala({
    code: input.code,
    title: input.title,
    date: input.date,
    days: Math.max(1, input.days || 1),
    startTime: input.startTime || undefined,
    endTime: input.endTime || undefined,
    destination: input.destination,
    password: input.password,
    members: [{ name: leaderName, role: 'leader', status: 'g', color: TONES[0] }],
    createdAt: Date.now(),
  });
  setCurrentMember(rec.code, { name: leaderName, role: 'leader' });
  return rec;
}

/** Adds a member (or returns the existing one with the same name). */
export function addMember(code: string, name: string, role: GalaRole = 'member'): MemberRecord | null {
  const rec = getGala(code);
  if (!rec) return null;
  const existing = rec.members.find((m) => m.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) return existing;
  const m: MemberRecord = { name: name.trim(), role, status: 'g', color: TONES[rec.members.length % TONES.length] };
  saveGala({ ...rec, members: [...rec.members, m] });
  return m;
}

/**
 * Called by Join a Gala after a successful join. If this device has never seen the gala
 * (joined via a code created elsewhere), it is stored from the looked-up preview.
 */
export function registerJoinedGala(
  code: string,
  nickname: string,
  preview?: { name: string; location: string; attendees?: string[] }
): void {
  if (!getGala(code) && preview) {
    saveGala({
      code,
      title: preview.name,
      date: '',
      days: 1,
      destination: preview.location,
      // The preview doesn't say who leads, so everyone already in is listed as a member.
      members: (preview.attendees ?? []).map((n, i) => ({
        name: n,
        role: 'member',
        status: 'g',
        color: TONES[i % TONES.length],
      })),
      createdAt: Date.now(),
    });
  }
  const m = addMember(code, nickname, 'member');
  if (m) setCurrentMember(code, { name: m.name, role: m.role });
}

export function setMemberStatus(code: string, name: string, status: AttendanceKey) {
  const rec = getGala(code);
  if (!rec) return;
  saveGala({ ...rec, members: rec.members.map((m) => (m.name === name ? { ...m, status } : m)) });
}

/* ---------------- current member ---------------- */

export function getCurrentMember(code: string): CurrentMember | null {
  return readJSON<CurrentMember>(session(), meKey(code)) ?? readJSON<CurrentMember>(local(), meKey(code));
}

export function setCurrentMember(code: string, me: CurrentMember) {
  writeJSON(session(), meKey(code), me);
  writeJSON(local(), meKey(code), me);
}

/** Calls `cb` whenever a gala or the current member changes, in this tab or another one. */
export function subscribeGalas(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

/**
 * Raw, comparable snapshot of one gala + the current member (for useSyncExternalStore).
 * Returns strings so unchanged storage gives an identical snapshot.
 */
export function galaSnapshot(code: string): string {
  const rec = getGala(code);
  const me = getCurrentMember(code);
  return JSON.stringify([rec, me]);
}

export const parseSnapshot = (snap: string): { rec: GalaRecord | null; me: CurrentMember | null } => {
  const [rec, me] = JSON.parse(snap) as [GalaRecord | null, CurrentMember | null];
  return { rec, me };
};

/* ---------------- display helpers ---------------- */

const parseDay = (iso: string): Date | null => {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

const md = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** "Nov 14–15, 2026", "Nov 14, 2026", "Nov 30 – Dec 2, 2026". Empty when no date. */
export function formatRange(iso: string, days: number): string {
  const start = parseDay(iso);
  if (!start) return '';
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + Math.max(1, days) - 1);
  const y = end.getFullYear();
  if (days <= 1) return `${md(start)}, ${y}`;
  if (start.getFullYear() !== y) return `${md(start)}, ${start.getFullYear()} – ${md(end)}, ${y}`;
  if (start.getMonth() === end.getMonth()) return `${md(start)}–${end.getDate()}, ${y}`;
  return `${md(start)} – ${md(end)}, ${y}`;
}

/** "Sat, Nov 14" */
export function formatDay(iso: string): string {
  const d = parseDay(iso);
  return d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
}

const hm = (t?: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

/** "5:30 AM – 9:00 PM" (or just the start). */
export const formatTimes = (start?: string, end?: string) => [hm(start), hm(end)].filter(Boolean).join(' – ');

/** Gala start as a Date (start time, or midnight). */
export function galaStart(iso: string, startTime?: string): Date | null {
  const d = parseDay(iso);
  if (!d) return null;
  const [h, m] = (startTime || '00:00').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** Days / hours / minutes until the start (never negative). */
export function countdownTo(start: Date | null, now = new Date()) {
  const ms = Math.max(0, (start?.getTime() ?? now.getTime()) - now.getTime());
  const mins = Math.floor(ms / 60000);
  return { d: Math.floor(mins / 1440), h: Math.floor((mins % 1440) / 60), m: mins % 60 };
}

/** planning before the first day, day during it, done after the last day. */
export function phaseFor(iso: string, days: number, now = new Date()): 'planning' | 'day' | 'done' {
  const start = parseDay(iso);
  if (!start) return 'planning';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = new Date(start.getFullYear(), start.getMonth(), start.getDate() + Math.max(1, days) - 1);
  if (today < start) return 'planning';
  if (today > last) return 'done';
  return 'day';
}
