'use client';

/** Room endpoints (docs/vault/API.md "getting in" + "inside a gala"). Types mirror the backend DTOs. */
import { api } from './client';

export type RoomRole = 'MEMBER' | 'HOST';
export type RsvpStatus = 'PENDING' | 'GOING' | 'MAYBE' | 'NOT_GOING';
export type TravelStatus = 'STILL_HOME' | 'ON_THE_WAY' | 'ALMOST_THERE' | 'ARRIVED';
export type GalaPhase = 'PLANNING' | 'GALA_DAY' | 'DONE';
export type RoomType = 'GROUP' | 'COUPLE';

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  limit: number;
}

export interface RoomDto {
  id: string;
  /** 8 characters, no prefix (display it with displayCode). */
  roomCode: string;
  title: string;
  destination: string;
  /** The destination's map pin; both null when none was picked. */
  destinationLat: number | null;
  destinationLng: number | null;
  /** yyyy-mm-dd */
  startDate: string;
  endDate: string | null;
  /** hh:mm:ss */
  startTime: string | null;
  endTime: string | null;
  /** Where everyone meets (the map's flag); all null when not set. */
  meetingLat: number | null;
  meetingLng: number | null;
  meetingLabel: string | null;
  hostUserId: string;
  status: string;
  type: RoomType;
  phase: GalaPhase;
  hasPassword: boolean;
  permissions: {
    membersCanEditPlan: boolean;
    membersCanAddPhotos: boolean;
    membersCanDeleteOwnPhotos: boolean;
    locationSharingEnabled: boolean;
  };
  /** Shown on the Join a Gala page (joining still needs the Gala Password). */
  listed: boolean;
  myRole: RoomRole | null;
  memberCount: number | null;
  createdAt: string;
}

export interface RoomMemberDto {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  role: RoomRole;
  rsvpStatus: RsvpStatus;
  travelStatus: TravelStatus;
  hasAccount: boolean;
  joinedAt: string;
}

export interface RoomPreviewDto {
  title: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  type: RoomType;
  memberCount: number;
  nicknames: string[];
  full: boolean;
}

export interface RoomSummaryDto {
  phase: GalaPhase;
  memberCount: number;
  rsvp: { going: number; maybe: number; notGoing: number; pending: number };
  travel: { stillHome: number; onTheWay: number; almostThere: number; arrived: number };
  itineraryStops: number;
  checklistDone: number;
  checklistTotal: number;
  budgetTotal: number;
  budgetPerPerson: number;
  totalSpent: number;
  settled: boolean;
  photoCount: number;
  unreadChat: number;
}

export interface CreateRoomRequest {
  title: string;
  nickname: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  destination: string;
  /** The destination's map pin, when a place was picked; send both or neither. */
  destinationLat?: number;
  destinationLng?: number;
  password: string;
  type?: RoomType;
  /** Where everyone meets, as text (the coordinates are set later). */
  meetingLabel?: string;
}

export const createRoom = (body: CreateRoomRequest) => api<RoomDto>('/rooms', { method: 'POST', body });

export const previewRoom = (code: string) => api<RoomPreviewDto>(`/rooms/preview?code=${encodeURIComponent(code)}`);

/** Every join needs the Gala Password (401 INVALID_GALA_PASSWORD when it doesn't match). */
export const joinRoom = (roomCode: string, nickname: string, password: string) =>
  api<RoomMemberDto>('/rooms/join', { method: 'POST', body: { roomCode, nickname, password } });

/** One listed gala on the Join a Gala page (GET /rooms/directory). */
export interface DirectoryRoomDto {
  roomCode: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string | null;
  type: RoomType;
  hostNickname: string | null;
  memberCount: number;
  full: boolean;
  alreadyMember: boolean;
}

/** Listed galas that haven't ended, soonest first; `q` searches title and destination. */
export const getDirectory = (q: string, cursor?: string | null, limit = 20) =>
  api<Page<DirectoryRoomDto>>(
    `/rooms/directory?limit=${limit}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}${
      cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
    }`
  );

export const getRoom = (roomId: string) => api<RoomDto>(`/rooms/${roomId}`);

export const getSummary = (roomId: string) => api<RoomSummaryDto>(`/rooms/${roomId}/summary`);

/** Every active member, following the cursor (50 per page, capped at 10 pages). */
export async function getAllMembers(roomId: string): Promise<RoomMemberDto[]> {
  const all: RoomMemberDto[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 10; i++) {
    const q: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: Page<RoomMemberDto> = await api<Page<RoomMemberDto>>(`/rooms/${roomId}/members?limit=50${q}`);
    all.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return all;
}

/** A member's account profile as other members see it (GET /rooms/{id}/members/profiles). Members who never saved one are absent. */
export interface RoomMemberProfileDto {
  userId: string;
  nickname: string;
  status: string;
  color: string | null;
  /** Drive file id of the profile photo (link-viewable), or null. */
  photoDriveFileId: string | null;
}

/** Everyone's saved profile (25 per page, capped at 8 pages). */
export async function getRoomProfiles(roomId: string): Promise<RoomMemberProfileDto[]> {
  const all: RoomMemberProfileDto[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 8; i++) {
    const q: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: Page<RoomMemberProfileDto> = await api<Page<RoomMemberProfileDto>>(
      `/rooms/${roomId}/members/profiles?limit=25${q}`
    );
    all.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return all;
}

export const updateRsvp =(roomId: string, rsvpStatus: RsvpStatus) =>
  api<RoomMemberDto>(`/rooms/${roomId}/members/me/rsvp`, { method: 'PATCH', body: { rsvpStatus } });

/** Host only: brings an archived gala back ("revive" a shelved plan). */
export const restoreRoom = (roomId: string) => api<RoomDto>(`/rooms/${roomId}/restore`, { method: 'POST' });
