import { api } from './client';
import type { CreateRoomRequest, DirectoryRoomDto, MyRoomDto, MyRoomsView, Page, RoomDto, RoomMemberDto, RoomPreviewDto } from './types';
import { rawCode, rememberRooms, roomIdFor } from '@/lib/rooms';

const VIEWS: MyRoomsView[] = ['upcoming', 'ongoing', 'completed', 'archived'];
const PAGE = 50;
const MAX_PAGES = 10;

/** Listed galas that haven't ended, soonest first; `q` searches title and destination. */
export const getDirectory = (q: string, cursor: string | null, limit = 5) =>
  api<Page<DirectoryRoomDto>>(
    `/rooms/directory?limit=${limit}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
  );

export const previewRoom =(code: string) => api<RoomPreviewDto>(`/rooms/preview?code=${encodeURIComponent(rawCode(code))}`);

export async function joinRoom(code: string, nickname: string, password: string): Promise<string> {
  const member = await api<RoomMemberDto>('/rooms/join', {
    method: 'POST',
    body: { roomCode: rawCode(code), nickname: nickname.trim(), password },
  });
  await rememberRooms([{ roomCode: code, roomId: member.roomId }]);
  return member.roomId;
}

export async function createRoom(body: CreateRoomRequest): Promise<RoomDto> {
  const room = await api<RoomDto>('/rooms', { method: 'POST', body });
  await rememberRooms([{ roomCode: room.roomCode, roomId: room.id }]);
  return room;
}

/** Every gala in one My Galas view, following the cursor (50 per page, capped at 10 pages, like the web). */
export async function getAllMyRooms(view: MyRoomsView): Promise<MyRoomDto[]> {
  const all: MyRoomDto[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const q: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: Page<MyRoomDto> = await api<Page<MyRoomDto>>(`/me/rooms?view=${view}&limit=${PAGE}${q}`);
    all.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  await rememberRooms(all);
  return all;
}

/** Room id for a code: the cache first, then every My Galas view (paged, capped). Null = not a member. */
export async function findRoomId(code: string): Promise<string | null> {
  const cached = await roomIdFor(code);
  if (cached) return cached;
  for (const view of VIEWS) {
    let cursor: string | null = null;
    for (let i = 0; i < MAX_PAGES; i++) {
      const q: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
      const page: Page<MyRoomDto> = await api<Page<MyRoomDto>>(`/me/rooms?view=${view}&limit=${PAGE}${q}`);
      await rememberRooms(page.items);
      if (page.items.some((r) => rawCode(r.roomCode) === rawCode(code))) return roomIdFor(code);
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
  }
  return null;
}
