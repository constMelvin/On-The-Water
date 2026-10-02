/**
 * Who's who in the mock. The backend refers to people by userId (UUID); the mock uses
 * "mock:<nickname>" so a name can always be shown, in the demo gala and in real rooms.
 * Also holds the small date helper the demo seeds share.
 */
import { MEM } from '../data';
import type { MockMember } from './types';

/** Room id stored on demo rows (the backend fills in the real UUID). */
// TODO(backend): remove demo seed before production (goes with DEMO_CODE in store.ts).
export const DEMO_ROOM_ID = 'mock-room-demo';

const PREFIX = 'mock:';

/**
 * Mock user id for a nickname. Use mockUserId(me) from useGala() as createdBy / paidBy.
 * TODO(backend): replace with the real userId (RoomMemberDto.userId) when the tab is wired.
 */
export const mockUserId = (nickname: string): string => PREFIX + nickname;

/** The demo gala's roster (reference MEM). The first one is the Gala Leader. */
export const DEMO_MEMBERS: MockMember[] = MEM.map((m, i) => ({
  userId: mockUserId(m.n),
  nickname: m.n,
  role: i === 0 ? 'HOST' : 'MEMBER',
  tone: m.c,
}));

/**
 * Display name for a userId. Looks in `members` first (pass the real ones once wired),
 * then falls back to the mock id's nickname.
 */
export function nameOf(userId: string | null | undefined, members: { userId: string; nickname: string }[] = DEMO_MEMBERS): string {
  if (!userId) return '';
  const m = members.find((x) => x.userId === userId);
  if (m) return m.nickname;
  return userId.startsWith(PREFIX) ? userId.slice(PREFIX.length) : '?';
}

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

/** Reference labels ("Nov 14", "5:30 AM") -> ISO in Manila time, e.g. 2026-11-14T05:30:00+08:00. */
export function demoTime(day: string, time = '12:00 AM'): string {
  const [mon = '', d = '1'] = day.trim().split(/\s+/);
  const t = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  let h = t ? Number(t[1]) % 12 : 0;
  if (t && t[3].toUpperCase() === 'PM') h += 12;
  const mm = t ? t[2] : '00';
  return `2026-${MONTHS[mon] ?? '01'}-${d.padStart(2, '0')}T${String(h).padStart(2, '0')}:${mm}:00+08:00`;
}
