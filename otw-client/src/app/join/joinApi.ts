import { isApiError } from '@/lib/api/client';
import { joinRoom, previewRoom } from '@/lib/api/rooms';
import { daysBetween, formatRange, rememberRoom } from '@/lib/otw/gala-registry';

export interface GalaEvent {
  name: string;
  dateRange: string;
  location: string;
  attendeeCount: number;
  attendees: string[];
}

export type LookupGalaResult =
  | { ok: true; event: GalaEvent }
  | { ok: false; error: 'NOT_FOUND' | 'ROOM_FULL' | 'OTHER'; message?: string };

export interface JoinGalaParams {
  code: string;
  nickname: string;
}

export type JoinGalaResult =
  | { ok: true; roomId: string }
  | {
      ok: false;
      error: 'NOT_FOUND' | 'INVALID_NICKNAME' | 'DUPLICATE_NICKNAME' | 'ROOM_FULL' | 'ALREADY_A_MEMBER' | 'OTHER';
      message?: string;
    };

const notFound = (e: unknown) => isApiError(e, 'INVALID_CODE') || isApiError(e, 'ROOM_NOT_FOUND');

/** GET /rooms/preview: "Is this the one?" */
export async function lookupGala(code: string): Promise<LookupGalaResult> {
  try {
    const p = await previewRoom(code);
    if (p.full) return { ok: false, error: 'ROOM_FULL' };
    return {
      ok: true,
      event: {
        name: p.title,
        dateRange: formatRange(p.startDate, daysBetween(p.startDate, p.endDate)),
        location: p.destination,
        attendeeCount: p.memberCount,
        attendees: p.nicknames,
      },
    };
  } catch (e) {
    if (notFound(e)) return { ok: false, error: 'NOT_FOUND' };
    return { ok: false, error: 'OTHER', message: e instanceof Error ? e.message : undefined };
  }
}

/** POST /rooms/join. On success this device remembers the room id for the code. */
export async function joinGala({ code, nickname }: JoinGalaParams): Promise<JoinGalaResult> {
  const trimmed = nickname.trim();
  if (trimmed.length < 2 || trimmed.length > 20) return { ok: false, error: 'INVALID_NICKNAME' };

  try {
    const m = await joinRoom(code, trimmed);
    rememberRoom(code, m.roomId);
    return { ok: true, roomId: m.roomId };
  } catch (e) {
    if (notFound(e)) return { ok: false, error: 'NOT_FOUND' };
    for (const code of ['DUPLICATE_NICKNAME', 'ROOM_FULL', 'ALREADY_A_MEMBER'] as const) {
      if (isApiError(e, code)) return { ok: false, error: code, message: e.message };
    }
    return { ok: false, error: 'OTHER', message: e instanceof Error ? e.message : undefined };
  }
}
