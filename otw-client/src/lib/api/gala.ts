'use client';

/**
 * Everything inside a gala (docs/vault/API.md "inside a gala"): itinerary, checklist, budget,
 * expenses + settlement, chat, location, photos, couple ideas, gala settings and my membership.
 * Every path is room-scoped and guarded by @RequireRoomRole on the server.
 */
import { api } from './client';
import type { Page, RoomDto, RoomMemberDto, TravelStatus } from './rooms';
import type {
  AwardKey,
  AwardsVM,
  BucketItemVM,
  HalfwayVM,
  QuizCategory,
  QuizMode,
  QuizSessionVM,
  SpotCategory,
  SpotsVM,
  BudgetVM,
  ChatMessageVM,
  ChecklistItemVM,
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

/* ---------------- couple: Our Little Bucket List (one list per gala) ---------------- */

/** Every item of this gala's list, following the cursor (50 per page, capped at 10 pages). */
export async function getBucket(roomId: string): Promise<BucketItemVM[]> {
  const all: BucketItemVM[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 10; i++) {
    const q: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: Page<BucketItemVM> = await api<Page<BucketItemVM>>(`${room(roomId)}/couple/bucket?limit=50${q}`);
    all.push(...page.items);
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return all;
}

export interface BucketInput {
  title: string;
  description?: string;
  estBudget?: number;
  targetDate?: string;
}

export const createBucketItem = (roomId: string, body: BucketInput) =>
  api<BucketItemVM>(`${room(roomId)}/couple/bucket`, { method: 'POST', body });

/** A missing field means "leave as is"; `version` is the one the item was read at (409 when it's stale). */
export interface BucketPatch {
  title?: string;
  description?: string;
  estBudget?: number;
  clearBudget?: boolean;
  targetDate?: string;
  clearDate?: boolean;
  completed?: boolean;
  photoId?: string;
  clearPhoto?: boolean;
  memory?: string;
  version: number;
}

export const updateBucketItem = (roomId: string, id: string, body: BucketPatch) =>
  api<BucketItemVM>(`${room(roomId)}/couple/bucket/${id}`, { method: 'PATCH', body });

export const deleteBucketItem = (roomId: string, id: string) =>
  api<void>(`${room(roomId)}/couple/bucket/${id}`, { method: 'DELETE' });

/* ---------------- couple: Halfway Checker ---------------- */

export const getHalfway = (roomId: string) => api<HalfwayVM>(`${room(roomId)}/couple/halfway`);

export const saveHome = (roomId: string, body: { lat: number; lng: number; label: string }) =>
  api<HalfwayVM>(`${room(roomId)}/couple/halfway/home`, { method: 'PUT', body });

export const getSpots = (roomId: string, category: SpotCategory) =>
  api<SpotsVM>(`${room(roomId)}/couple/halfway/spots?category=${category}`);

/* ---------------- couple: Who Knows Who Better? ---------------- */

export const getLatestQuiz = (roomId: string) =>
  api<{ session: QuizSessionVM | null }>(`${room(roomId)}/couple/quiz/latest`).then((r) => r.session);

export const startQuiz = (roomId: string, body: { mode: QuizMode; category?: QuizCategory }) =>
  api<QuizSessionVM>(`${room(roomId)}/couple/quiz`, { method: 'POST', body });

export interface QuizAnswerInput {
  questionKey: string;
  ownAnswer?: string;
  guessAnswer?: string;
  textAnswer?: string;
}

export const answerQuiz = (roomId: string, sessionId: string, body: QuizAnswerInput) =>
  api<QuizSessionVM>(`${room(roomId)}/couple/quiz/${sessionId}/answers`, { method: 'PUT', body });

/* ---------------- Barkada Awards (after the gala) ---------------- */

export const getAwards = (roomId: string) => api<AwardsVM>(`${room(roomId)}/awards`);

/** Gala Leader only. `hours` is 24, 48 or 72. */
export const openAwards = (roomId: string, hours: 24 | 48 | 72) =>
  api<AwardsVM>(`${room(roomId)}/awards/poll?hours=${hours}`, { method: 'POST' });

/** Gala Leader only: closes voting now (also what a demo uses instead of waiting for the window to end). */
export const closeAwards = (roomId: string) => api<AwardsVM>(`${room(roomId)}/awards/poll/close`, { method: 'POST' });

export const castVote = (roomId: string, category: AwardKey, nomineeUserId: string) =>
  api<AwardsVM>(`${room(roomId)}/awards/votes/${category}`, { method: 'PUT', body: { nomineeUserId } });

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
