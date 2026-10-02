'use client';

/** Account area endpoints (docs/vault/API.md "account"). Types mirror the backend DTOs. */
import { api } from './client';
import type { GalaPhase, Page, RoomRole, RoomType } from './rooms';

export type MyRoomsView = 'upcoming' | 'ongoing' | 'completed' | 'archived';

export interface MyRoomDto {
  roomId: string;
  /** 8 characters, no OTW- prefix (display it with galaRoute / normCode). */
  roomCode: string;
  title: string;
  destination: string;
  /** yyyy-mm-dd; null when the gala has no date yet. */
  startDate: string | null;
  endDate: string | null;
  type: RoomType;
  status: string;
  phase: GalaPhase;
  myRole: RoomRole;
  memberCount: number;
}

export interface MyRoomStatsDto {
  completed: number;
  people: number;
  archived: number;
}

const PAGE_SIZE = 50;
const MAX_PAGES = 10;

/** Every gala in one view, following the cursor (50 per page, capped at 10 pages). */
export async function getAllMyRooms(view: MyRoomsView): Promise<MyRoomDto[]> {
  const all: MyRoomDto[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const q: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: Page<MyRoomDto> = await api<Page<MyRoomDto>>(`/me/rooms?view=${view}&limit=${PAGE_SIZE}${q}`);
    all.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return all;
}

export const getMyRoomStats = () => api<MyRoomStatsDto>('/me/rooms/stats');
