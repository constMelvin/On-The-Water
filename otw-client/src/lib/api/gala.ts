'use client';

/**
 * Everything inside a gala (docs/vault/API.md "inside a gala"): itinerary, checklist, budget,
 * expenses + settlement, chat, location, photos, couple ideas, gala settings and my membership.
 * Every path is room-scoped and guarded by @RequireRoomRole on the server.
 */
import { api } from './client';
import type { Page, RoomDto, RoomMemberDto, TravelStatus } from './rooms';
import type {
  BudgetVM,
  ChatMessageVM,
  ChecklistItemVM,
  CoupleIdeaKey,
  CoupleIdeaVM,
  ExpenseCategory,
  ExpenseVM,
  ItineraryItemVM,
  MemberLocationVM,
  PhotoVM,
  ReactionType,
  RoomPermissionsVM,
  SettlementPaymentVM,
  SettlementVM,
  ShareMode,
  StopType,
  UnreadVM,
} from './types';

const MAX_PAGES = 10;

/** Every row of a paged list, following the cursor (50 per page, capped at 10 pages). */
async function all<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  const sep = path.includes('?') ? '&' : '?';
  for (let i = 0; i < MAX_PAGES; i++) {
    const q: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: Page<T> = await api<Page<T>>(`${path}${sep}limit=50${q}`);
    out.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return out;
}

const room = (roomId: string) => `/rooms/${roomId}`;

/* ---------------- itinerary ---------------- */

export const getItinerary = (roomId: string) => all<ItineraryItemVM>(`${room(roomId)}/itinerary`);

export interface StopInput {
  title: string;
  notes?: string | null;
  startsAt?: string | null;
  stopType?: StopType;
  /** The stop's map pin; send both or neither. */
  lat?: number | null;
  lng?: number | null;
}

export const createStop = (roomId: string, body: StopInput) =>
  api<ItineraryItemVM>(`${room(roomId)}/itinerary`, { method: 'POST', body });

export const updateStop = (
  roomId: string,
  id: string,
  body: Partial<StopInput> & { completed?: boolean; clearPin?: boolean; version: number }
) => api<ItineraryItemVM>(`${room(roomId)}/itinerary/${id}`, { method: 'PATCH', body });

/** The full route in its new order, each with the version last seen (stale -> 409). */
export const reorderStops = (roomId: string, items: { id: string; version: number }[]) =>
  api<ItineraryItemVM[]>(`${room(roomId)}/itinerary/reorder`, { method: 'POST', body: { items } });

export const deleteStop = (roomId: string, id: string) =>
  api<void>(`${room(roomId)}/itinerary/${id}`, { method: 'DELETE' });

/* ---------------- checklist ---------------- */

export const getChecklist = (roomId: string) => all<ChecklistItemVM>(`${room(roomId)}/checklist`);

export const createChecklistItem = (roomId: string, label: string, assignedTo: string | null) =>
  api<ChecklistItemVM>(`${room(roomId)}/checklist`, { method: 'POST', body: { label, assignedTo } });

export const updateChecklistItem = (
  roomId: string,
  id: string,
  body: { label?: string; assignedTo?: string; clearAssignment?: boolean; isDone?: boolean; version: number }
) => api<ChecklistItemVM>(`${room(roomId)}/checklist/${id}`, { method: 'PATCH', body });

export const claimChecklistItem = (roomId: string, id: string, version: number) =>
  api<ChecklistItemVM>(`${room(roomId)}/checklist/${id}/claim`, { method: 'POST', body: { version } });

export const deleteChecklistItem = (roomId: string, id: string) =>
  api<void>(`${room(roomId)}/checklist/${id}`, { method: 'DELETE' });

/* ---------------- budget ---------------- */

export const getBudget = (roomId: string) => api<BudgetVM>(`${room(roomId)}/budget`);

export type BudgetInput = Pick<
  BudgetVM,
  'transportAmount' | 'stayAmount' | 'foodAmount' | 'activitiesAmount' | 'otherAmount' | 'participantCount'
>;

/** Replaces the estimate (missing categories count as 0 on the server, so send all five). */
export const saveBudget = (roomId: string, body: BudgetInput) =>
  api<BudgetVM>(`${room(roomId)}/budget`, { method: 'PUT', body });

/* ---------------- expenses + settlement ---------------- */

export const getExpenses = (roomId: string) => all<ExpenseVM>(`${room(roomId)}/expenses`);

export interface ExpenseInput {
  description: string;
  amount: number;
  paidBy: string;
  category: ExpenseCategory;
  note?: string | null;
  /** Split equally between these people (the server writes the shares). */
  splitWithUserIds: string[];
}

export const createExpense = (roomId: string, body: ExpenseInput) =>
  api<ExpenseVM>(`${room(roomId)}/expenses`, { method: 'POST', body });

export const deleteExpense = (roomId: string, id: string) =>
  api<void>(`${room(roomId)}/expenses/${id}`, { method: 'DELETE' });

export const getSettlement = (roomId: string) => api<SettlementVM>(`${room(roomId)}/expenses/settlement`);

/** "Mark paid": records the full outstanding transfer from -> to (or `amount` for a partial payment). */
export const recordPayment = (roomId: string, fromUserId: string, toUserId: string, amount?: number) =>
  api<SettlementPaymentVM>(`${room(roomId)}/expenses/settlement/payments`, {
    method: 'POST',
    body: { fromUserId, toUserId, amount },
  });

export const deletePayment = (roomId: string, id: string) =>
  api<void>(`${room(roomId)}/expenses/settlement/payments/${id}`, { method: 'DELETE' });

/* ---------------- chat ---------------- */

/** One page of messages, newest first; `cursor` is the oldest id already held. */
export const getChatPage = (roomId: string, cursor?: string | null, limit = 30) =>
  api<Page<ChatMessageVM>>(
    `${room(roomId)}/chat/messages?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
  );

/** Sends a message; `photoId` attaches a photo I already put in the Gala Dump (the body is then a caption). */
export const sendChat = (roomId: string, body: string, photoId?: string) =>
  api<ChatMessageVM>(`${room(roomId)}/chat/messages`, { method: 'POST', body: { body, photoId } });

/** Sets my reaction on a message; null removes it. */
export const setReaction = (roomId: string, messageId: string, reaction: ReactionType | null) =>
  api<ChatMessageVM>(
    `${room(roomId)}/chat/messages/${messageId}/reaction`,
    reaction ? { method: 'PUT', body: { reaction } } : { method: 'DELETE' }
  );

export const markChatRead = (roomId: string) => api<void>(`${room(roomId)}/chat/read`, { method: 'PUT' });

export const getChatUnread = (roomId: string) => api<UnreadVM>(`${room(roomId)}/chat/unread`);

/* ---------------- location ---------------- */

export const getLocations = (roomId: string) => api<MemberLocationVM[]>(`${room(roomId)}/locations`);

export const shareLocation = (roomId: string, lat: number, lng: number, shareMode: ShareMode) =>
  api<MemberLocationVM>(`${room(roomId)}/location`, { method: 'PUT', body: { lat, lng, shareMode } });

export const stopSharingLocation = (roomId: string) => api<void>(`${room(roomId)}/location`, { method: 'DELETE' });

/* ---------------- photos ---------------- */

export const getPhotos = (roomId: string, mine = false) =>
  all<PhotoVM>(`${room(roomId)}/photos${mine ? '?mine=true' : ''}`);

/**
 * A one-time Google Drive upload link in this gala's own folder (made by the server on first use).
 * The browser PUTs the file to it; nobody signs in to Google.
 */
export const startPhotoUpload = (roomId: string, body: { fileName: string; mimeType: string; size: number }) =>
  api<{ uploadUrl: string }>(`${room(roomId)}/photos/uploads`, { method: 'POST', body });

/** Registers a file already uploaded to the gala's Google Drive folder (the server verifies it). */
export const registerPhoto = (roomId: string, driveFileId: string, caption?: string | null) =>
  api<PhotoVM>(`${room(roomId)}/photos`, { method: 'POST', body: { driveFileId, caption } });

export const deletePhoto = (roomId: string, id: string) =>
  api<void>(`${room(roomId)}/photos/${id}`, { method: 'DELETE' });

/* ---------------- couple mode ---------------- */

export const getCoupleIdeas = (roomId: string) => api<CoupleIdeaVM[]>(`${room(roomId)}/couple/ideas`);

export const setCoupleIdeaSaved = (roomId: string, key: CoupleIdeaKey, saved: boolean) =>
  api<CoupleIdeaVM>(`${room(roomId)}/couple/ideas/${key}`, { method: saved ? 'PUT' : 'DELETE' });

/* ---------------- gala settings (Gala Leader) ---------------- */

export interface UpdateRoomInput extends Partial<RoomPermissionsVM> {
  /** "List this gala" on the Join a Gala page. */
  listed?: boolean;
  title?: string;
  destination?: string;
  /** Send both or neither; a changed destination sent without them clears the old pin. */
  destinationLat?: number;
  destinationLng?: number;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  clearTimes?: boolean;
  meetingLat?: number;
  meetingLng?: number;
  meetingLabel?: string;
}

export const updateRoom = (roomId: string, body: UpdateRoomInput) =>
  api<RoomDto>(room(roomId), { method: 'PATCH', body });

export const changeGalaPassword = (roomId: string, newPassword: string) =>
  api<void>(`${room(roomId)}/password`, { method: 'PUT', body: { newPassword } });

export const regenerateCode = (roomId: string) => api<RoomDto>(`${room(roomId)}/code`, { method: 'POST' });

export const archiveRoom = (roomId: string) => api<RoomDto>(`${room(roomId)}/archive`, { method: 'POST' });

export const deleteRoom = (roomId: string) => api<void>(room(roomId), { method: 'DELETE' });

export const removeMember = (roomId: string, userId: string) =>
  api<void>(`${room(roomId)}/members/${userId}`, { method: 'DELETE' });

export const nudgeMember = (roomId: string, userId: string) =>
  api<void>(`${room(roomId)}/members/${userId}/nudge`, { method: 'POST' });

/* ---------------- my membership ---------------- */

export const updateMyNickname = (roomId: string, nickname: string) =>
  api<RoomMemberDto>(`${room(roomId)}/members/me`, { method: 'PATCH', body: { nickname } });

export const updateTravelStatus = (roomId: string, status: TravelStatus) =>
  api<RoomMemberDto>(`${room(roomId)}/members/me/travel-status`, { method: 'PUT', body: { status } });

export const leaveRoom = (roomId: string) => api<void>(`${room(roomId)}/members/me/leave`, { method: 'POST' });
