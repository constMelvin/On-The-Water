/**
 * Gala code -> room id cache. Thin async wrapper over the web's registry (lib/otw/gala-registry.ts), which keeps
 * the map in `otw:rooms` (kv, persisted to AsyncStorage). Links and QR codes carry the code; routes use the room id.
 */
import { forgetRoom as forgetCode, isValidCode as validCode, listRooms, normCode, rawCode as raw, rememberRoom, roomIdFor as idFor } from './otw/gala-registry';
import { kv } from './otw/kv';

export const rawCode = raw;
/** Display form: OTW-XXXX-XXXX. */
export const displayCode = normCode;
export const isValidCode = validCode;

/** Remember code -> roomId after GET /me/rooms, POST /rooms/join or POST /rooms. */
export async function rememberRooms(entries: { roomCode: string; roomId: string }[]) {
  for (const e of entries) if (idFor(e.roomCode) !== e.roomId) rememberRoom(e.roomCode, e.roomId);
}

export async function roomIdFor(code: string): Promise<string | null> {
  return idFor(code);
}

/** On NOT_A_ROOM_MEMBER. */
export async function forgetRoom(roomId: string) {
  for (const r of listRooms()) if (r.roomId === roomId) forgetCode(r.code);
}

/** On sign-out: every device-only `otw:` value (rooms, custom budget rows, stop extras). Theme is kept. */
export async function clearRooms() {
  const theme = kv.getItem('otw:theme');
  kv.clear();
  if (theme) kv.setItem('otw:theme', theme);
}
