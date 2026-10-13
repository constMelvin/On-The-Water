import { kv, subscribeKv } from './kv';
/**
 * Gala helpers shared by Plan a Gala, Join a Gala, My Galas and the dashboard.
 *
 * The backend (otw-server) is the source of truth for galas. This device only remembers
 * which room id a gala code maps to (localStorage "otw:rooms" -> { [CODE]: roomId }),
 * written after a successful create / join (or when My Galas lists it). Who "I" am is the Supabase session.
 */

const ROOMS_KEY = 'otw:rooms';
const CODE_CHARS = /^[A-Z0-9]{8}$/;

/** The raw 8-character room code, from anything a person might type ("otw-7k2p-abcd" -> "7K2PABCD"). */
export function rawCode(code: string): string {
  let s = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length === 11 && s.startsWith('OTW')) s = s.slice(3);
  return s;
}

/** Display form used in URLs and on screen: OTW-XXXX-XXXX. Partial input is formatted as far as it goes. */
export function normCode(code: string): string {
  const s = rawCode(code);
  return CODE_CHARS.test(s) ? `OTW-${s.slice(0, 4)}-${s.slice(4)}` : code.trim().toUpperCase();
}

export const isValidCode = (code: string) => CODE_CHARS.test(rawCode(code));
export const galaRoute = (code: string) => `/gala/${encodeURIComponent(normCode(code))}`;

/* ---------------- code -> roomId on this device (never throws) ---------------- */

const listeners = new Set<() => void>();

function readRooms(): Record<string, string> {
  try {
    return JSON.parse(kv.getItem(ROOMS_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function writeRooms(rooms: Record<string, string>) {
  try {
    kv.setItem(ROOMS_KEY, JSON.stringify(rooms));
  } catch {
    /* storage blocked: the gala still opens for this page view */
  }
  listeners.forEach((l) => l());
}

/** Remembers that `code` is room `roomId` (after create / join / My Galas). */
export function rememberRoom(code: string, roomId: string) {
  writeRooms({ ...readRooms(), [rawCode(code)]: roomId });
}

/** Forgets a gala on this device (e.g. the backend says I'm no longer a member). */
export function forgetRoom(code: string) {
  const rooms = readRooms();
  delete rooms[rawCode(code)];
  writeRooms(rooms);
}

/** The room id for `code` on this device, or null when this device hasn't joined it. */
export function roomIdFor(code: string): string | null {
  if (false) return null;
  return readRooms()[rawCode(code)] ?? null;
}

/**
 * Raw snapshot of the code -> roomId map ('{}' when empty). A string, so it can be used
 * directly as a `useSyncExternalStore` snapshot (stable until the map really changes).
 */
export function roomsSnapshot(): string {
  if (false) return '{}';
  try {
    return kv.getItem(ROOMS_KEY) ?? '{}';
  } catch {
    return '{}';
  }
}

/** Every gala this device has joined, as display codes + room ids (from a snapshot string). */
export function listRooms(snapshot: string = roomsSnapshot()): { code: string; roomId: string }[] {
  let rooms: Record<string, string> = {};
  try {
    rooms = JSON.parse(snapshot) as Record<string, string>;
  } catch {
    /* corrupt entry: treat as empty */
  }
  return Object.entries(rooms).map(([raw, roomId]) => ({ code: normCode(raw), roomId }));
}

/** Calls `cb` when the code -> roomId map changes, in this tab or another one. */
export function subscribeRooms(cb: () => void): () => void {
  listeners.add(cb);
  const off = subscribeKv(cb);
  return () => {
    listeners.delete(cb);
    off();
  };
}

/** Number of days a gala spans (1 for a day tour). */
export function daysBetween(startIso: string, endIso?: string | null): number {
  if (!endIso) return 1;
  const ms = Date.parse(endIso) - Date.parse(startIso);
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 86_400_000) + 1) : 1;
}

/** yyyy-mm-dd plus `days` days. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

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
