/**
 * View-model types for the mock slices. Field names mirror the backend DTOs in
 * otw-server/src/main/java/com/gala/otw_server/<feature>/dto/ so wiring a tab is a swap:
 * replace the slice read with the query, keep the type.
 *
 * Conventions (same as lib/api/rooms.ts):
 * - UUIDs are strings. In the mock, user ids are mock member ids (see mock/members.ts).
 * - OffsetDateTime is an ISO-8601 string.
 * - BigDecimal is a number (Jackson writes it as a JSON number; scale 2 on the server).
 * Anything not in a backend DTO is marked TODO(backend).
 */

/* ---------------- members (for name lookups) ---------------- */

export type MockTone = 'rosy' | 'teal' | 'zest' | 'blossom';

/** Subset of RoomMemberDto that the tabs need to show a name next to a userId. */
export interface MockMember {
  userId: string;
  nickname: string;
  role: 'MEMBER' | 'HOST';
  // TODO(backend): confirm shape. Avatar tone is a frontend choice, not in RoomMemberDto.
  tone: MockTone;
}

/* ---------------- itinerary: ItineraryItemDto ---------------- */

export type StopType = 'MEET_UP' | 'ACTIVITY' | 'FOOD';

export interface ItineraryItemVM {
  id: string;
  roomId: string;
  title: string;
  notes: string | null;
  /** ISO date-time, or null when no time is set. */
  startsAt: string | null;
  stopType: StopType;
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
  updatedBy: string | null;
  updatedAt: string;
}

/* ---------------- expenses: ExpenseDto / ExpenseShareDto / SettlementDto ---------------- */

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

/** SettlementDto. The mock derives it from expenses; the server computes it. */
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
  transfers: { fromUserId: string; toUserId: string; amount: number }[];
  payments: unknown[]; // TODO(backend): confirm shape (SettlementPaymentDto), not needed until "Mark as paid".
  me: { share: number; paid: number; remaining: number };
  settled: boolean;
}

/* ---------------- chat: ChatMessageDto ---------------- */

export type MessageKind = 'TEXT' | 'SYSTEM' | 'CARD';

export interface ChatMessageVM {
  id: string;
  roomId: string;
  /** null for SYSTEM messages. */
  senderUserId: string | null;
  kind: MessageKind;
  body: string;
  /** For CARD messages: what the card points at, e.g. 'ITINERARY_ITEM'. */
  refType: string | null;
  refId: string | null;
  heartCount: number;
  reactedByMe: boolean;
  createdAt: string;
  // TODO(backend): confirm shape. The CARD's display line ("Session Road lunch · 12:30 PM")
  // isn't in ChatMessageDto; the real tab should build it from refType/refId.
  cardText?: string;
}

export interface ChatVM {
  messages: ChatMessageVM[];
  // TODO(backend): confirm shape. Where "new messages" starts; the backend has GET .../chat/unread (UnreadDto).
  lastReadAt: string | null;
}

/* ---------------- location: MemberLocationDto + travel status ---------------- */

export type ShareMode = 'PIN' | 'LIVE';
export type TravelStatus = 'STILL_HOME' | 'ON_THE_WAY' | 'ALMOST_THERE' | 'ARRIVED';

export interface MemberLocationVM {
  userId: string;
  lat: number;
  lng: number;
  shareMode: ShareMode;
  expiresAt: string | null;
  updatedAt: string;
}

export interface LocationVM {
  /** Only members who opted in. Sharing is always opt-in. */
  locations: MemberLocationVM[];
  /** RoomMemberDto.travelStatus, keyed by userId (PATCH .../members/me/travel-status). */
  travel: Record<string, TravelStatus>;
}

/* ---------------- photos: PhotoDto ---------------- */

export interface PhotoVM {
  id: string;
  roomId: string;
  driveFileId: string;
  uploadedBy: string;
  caption: string | null;
  /** 'PENDING' until the Drive file is verified, then 'READY'. */
  status: string;
  createdAt: string;
  // TODO(backend): confirm shape. Mock-only placeholders (no real image): tile tone and masonry height.
  tone?: MockTone;
  height?: number;
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
