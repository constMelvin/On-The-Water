/**
 * Feature DTOs, mirroring otw-server/src/main/java/com/gala/otw_server/<feature>/dto/.
 *
 * Conventions (same as rooms.ts):
 * - UUIDs are strings; OffsetDateTime is an ISO-8601 string.
 * - BigDecimal is a number (Jackson writes it as a JSON number; scale 2 on the server).
 */

/* ---------------- itinerary: ItineraryItemDto ---------------- */

export type StopType = 'MEET_UP' | 'ACTIVITY' | 'FOOD';

export interface ItineraryItemVM {
  id: string;
  roomId: string;
  /** The place. */
  title: string;
  notes: string | null;
  /** ISO date-time, or null when no time is set. */
  startsAt: string | null;
  stopType: StopType;
  /** The stop's map pin (both null when it has none). */
  lat: number | null;
  lng: number | null;
  position: number;
  createdBy: string;
  completed: boolean;
  /** Optimistic-lock version: send it back on update; a stale one is a 409. */
  version: number;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- checklist: ChecklistItemDto ---------------- */

export interface ChecklistItemVM {
  id: string;
  roomId: string;
  label: string;
  assignedTo: string | null;
  isDone: boolean;
  doneBy: string | null;
  doneAt: string | null;
  /** Optimistic-lock version: send it back on update; a stale one is a 409. */
  version: number;
  createdAt: string;
}

/* ---------------- budget: BudgetDto ---------------- */

export interface BudgetVM {
  roomId: string;
  transportAmount: number;
  stayAmount: number;
  foodAmount: number;
  activitiesAmount: number;
  otherAmount: number;
  participantCount: number;
  /** Sum of the five categories (server-computed). */
  estimatedAmount: number;
  /** estimatedAmount / max(1, participantCount), 2 dp HALF_UP (server-computed). */
  perPerson: number;
  currency: string;
  /** null until someone saves an estimate (the room has none yet). */
  updatedBy: string | null;
  updatedAt: string;
}

/* ---------------- expenses: ExpenseDto / SettlementDto ---------------- */

export type ExpenseCategory = 'FOOD' | 'TRANSPORTATION' | 'STAY' | 'ACTIVITIES' | 'OTHER';

export interface ExpenseShareVM {
  userId: string;
  shareAmount: number;
}

export interface ExpenseVM {
  id: string;
  roomId: string;
  description: string;
  amount: number;
  paidBy: string;
  category: ExpenseCategory;
  note: string | null;
  shares: ExpenseShareVM[];
  createdAt: string;
}

export interface SettlementPaymentVM {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  recordedBy: string;
  createdAt: string;
}

export interface SettlementVM {
  roomId: string;
  totalExpenses: number;
  balances: {
    userId: string;
    totalPaid: number;
    totalOwed: number;
    paymentsSent: number;
    paymentsReceived: number;
    netBalance: number;
  }[];
  /** What is still outstanding after the recorded payments. */
  transfers: { fromUserId: string; toUserId: string; amount: number }[];
  /** Recorded "Mark paid" rows. */
  payments: SettlementPaymentVM[];
  /** The caller's tiles: remaining > 0 = owed money, < 0 = owes. */
  me: { share: number; paid: number; remaining: number } | null;
  settled: boolean;
}

/* ---------------- chat: ChatMessageDto ---------------- */

export type MessageKind = 'TEXT' | 'SYSTEM' | 'CARD';

/** One reaction per member per message; picking another replaces it. */
export type ReactionType = 'HEART' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | 'LIKE';

export interface ChatMessageVM {
  id: string;
  roomId: string;
  /** null for SYSTEM messages. */
  senderUserId: string | null;
  kind: MessageKind;
  /** Plain text (React escapes it). For a CARD it is the full line, e.g. "added a new itinerary stop: …". */
  body: string;
  /** For CARD messages: 'ITINERARY_ITEM' or 'EXPENSE'; 'PHOTO' for a TEXT message with a Gala Dump photo. */
  refType: string | null;
  refId: string | null;
  /** The attached photo (refType 'PHOTO'); null when there is none or it was deleted from the Dump. */
  photo: { driveFileId: string; mimeType: string | null } | null;
  /** Count per reaction (only reactions someone used). */
  reactions: Partial<Record<ReactionType, number>>;
  /** My reaction on this message, or null. */
  myReaction: ReactionType | null;
  /** Heart-only view, kept for older code paths. */
  heartCount: number;
  reactedByMe: boolean;
  createdAt: string;
}

export interface UnreadVM {
  count: number;
  /** Where the "N new" divider goes; null when nothing is unread. */
  firstUnreadId: string | null;
}

/* ---------------- location: MemberLocationDto ---------------- */

export type ShareMode = 'PIN' | 'LIVE';

export interface MemberLocationVM {
  userId: string;
  lat: number;
  lng: number;
  shareMode: ShareMode;
  expiresAt: string | null;
  updatedAt: string;
}

/* ---------------- photos: PhotoDto ---------------- */

export interface PhotoVM {
  id: string;
  roomId: string;
  driveFileId: string;
  uploadedBy: string;
  caption: string | null;
  /** Drive MIME type (image/... or video/...); null for photos added before videos were allowed. */
  mimeType: string | null;
  /** 'PENDING' until the Drive file is verified, then 'READY'. */
  status: string;
  createdAt: string;
}

/* ---------------- couple: CoupleIdeaDto ---------------- */

export type CoupleIdeaKey =
  | 'SUNSET_AT_THE_PARK'
  | 'COFFEE_CRAWL'
  | 'PICNIC_WITH_A_PLAYLIST'
  | 'NIGHT_MARKET_FOOD_TRIP'
  | 'MUSEUM_THEN_MERIENDA'
  | 'MOVIE_NIGHT_AT_HOME';

export interface CoupleIdeaVM {
  key: CoupleIdeaKey;
  title: string;
  estimatedCost: number;
  durationHours: number;
  saved: boolean;
  savedBy: string | null;
}

/* ---------------- settings: RoomPermissionsDto ---------------- */

export interface RoomPermissionsVM {
  membersCanEditPlan: boolean;
  membersCanAddPhotos: boolean;
  membersCanDeleteOwnPhotos: boolean;
  locationSharingEnabled: boolean;
}
