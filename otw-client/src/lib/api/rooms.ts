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
  /** yyyy-mm-dd */
  startDate: string;
  endDate: string | null;
  /** hh:mm:ss */
  startTime: string | null;
  endTime: string | null;
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

export interface EnterRoomResponse {
  roomId: string;
  title: string;
  alreadyMember: boolean;
  members: { memberId: string; nickname: string; role: RoomRole; hasAccount: boolean }[];
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
  password: string;
  type?: RoomType;
}

export const createRoom = (body: CreateRoomRequest) => api<RoomDto>('/rooms', { method: 'POST', body });

export const previewRoom = (code: string) => api<RoomPreviewDto>(`/rooms/preview?code=${encodeURIComponent(code)}`);

export const joinRoom = (roomCode: string, nickname: string) =>
  api<RoomMemberDto>('/rooms/join', { method: 'POST', body: { roomCode, nickname } });

export const enterRoom = (roomCode: string, password: string) =>
  api<EnterRoomResponse>('/rooms/enter', { method: 'POST', body: { roomCode, password } });

export const claimMember = (roomCode: string, password: string, memberId: string) =>
  api<RoomMemberDto>('/rooms/enter/claim', { method: 'POST', body: { roomCode, password, memberId } });

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

export const updateRsvp = (roomId: string, rsvpStatus: RsvpStatus) =>
  api<RoomMemberDto>(`/rooms/${roomId}/members/me/rsvp`, { method: 'PATCH', body: { rsvpStatus } });
