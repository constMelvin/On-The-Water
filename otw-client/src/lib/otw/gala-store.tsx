'use client';

/**
 * Gala state for everything inside /gala/[code], loaded from the OTW backend:
 * GET /rooms/{id}, /rooms/{id}/members and /rooms/{id}/summary. The room id comes from
 * this device's code -> roomId map (written by Plan / Join / Enter a Gala); "me" is the
 * member row whose userId is this device's Supabase user.
 * Data refreshes every 15 s and on window focus (no realtime subscription yet).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttendanceKey, Budget, ChecklistItem, Expense, Gala, Member, Stop, Tone } from './data';
import {
  daysBetween,
  forgetRoom,
  formatDay,
  formatRange,
  formatTimes,
  isValidCode,
  normCode,
  roomIdFor,
  subscribeRooms,
} from './gala-registry';
import { toast } from './feedback';
import { isApiError } from '@/lib/api/client';
import { currentUserId } from '@/lib/api/supabase';
import {
  getAllMembers,
  getRoom,
  getSummary,
  updateRsvp,
  type GalaPhase,
  type RoomDto,
  type RoomSummaryDto,
  type RsvpStatus,
} from '@/lib/api/rooms';

export type Role = 'leader' | 'member';
export type Phase = 'planning' | 'day' | 'done';
export type SheetKey = 'more' | 'share' | 'account';
/** Screen state for loading / empty / error / offline variants. */
export type ViewState = 'default' | 'loading' | 'empty' | 'error' | 'offline';
/**
 * loading = talking to the backend; missing = unknown code; guest = this device isn't a
 * member (goes to Enter a Gala); error = backend unreachable or failed; ready = in.
 */
export type LoadStatus = 'loading' | 'missing' | 'guest' | 'error' | 'ready';

export interface GalaState {
  status: LoadStatus;
  /** Why status is 'error'. */
  error: string;
  roomId: string | null;
  gala: Gala;
  members: Member[];
  /** Counts for the dashboard cards, straight from GET /summary (null until loaded). */
  summary: RoomSummaryDto | null;
  /** My display name in this gala. */
  me: string;
  role: Role;
  phase: Phase;
  hasAccount: boolean;
  myStatus: AttendanceKey;
  stops: Stop[];
  items: ChecklistItem[];
  budget: Budget;
  expenses: Expense[];
  /** Unread chat messages (drives the Chismis / Chat badge). */
  unread: number;
  /** Which shell sheet is open, if any. */
  sheet: SheetKey | null;
  viewState: ViewState;
  /** Real screen state from the live queries: loading / error / offline (stale data) / default. The dev switcher's viewState wins over it. */
  liveState: ViewState;
  /** Refetches the gala (room, members, summary): the "Try again" action. Resolves true when the refetch worked. */
  retry: () => Promise<boolean>;
  /** The dashboard's account banner; dismissing hides it for the session. */
  bannerOpen: boolean;

  /** Dev switcher override; the real role comes from the backend. */
  setRole: (role: Role) => void;
  /** Dev switcher override; the real phase comes from the backend. */
  setPhase: (phase: Phase) => void;
  setHasAccount: (v: boolean) => void;
  /** PATCH /members/me/rsvp, then refreshes members + summary. */
  setMyStatus: (status: AttendanceKey) => void;
  setStops: (v: Stop[]) => void;
  setItems: (v: ChecklistItem[]) => void;
  setBudget: (v: Budget) => void;
  setExpenses: (v: Expense[]) => void;
  setUnread: (v: number) => void;
  openSheet: (key: SheetKey) => void;
  closeSheet: () => void;
  setViewState: (v: ViewState) => void;
  dismissBanner: () => void;
}

const GalaContext = createContext<GalaState | null>(null);

const TONES: Tone[] = ['rosy', 'teal', 'zest', 'blossom'];
const PHASE: Record<GalaPhase, Phase> = { PLANNING: 'planning', GALA_DAY: 'day', DONE: 'done' };
/** PENDING (hasn't answered yet) shows as Maybe: the dashboard only has three states. */
const ATTEND: Record<RsvpStatus, AttendanceKey> = { GOING: 'g', MAYBE: 'm', NOT_GOING: 'x', PENDING: 'm' };
const RSVP: Record<AttendanceKey, RsvpStatus> = { g: 'GOING', m: 'MAYBE', x: 'NOT_GOING' };

const NO_STOPS: Stop[] = [];
const NO_ITEMS: ChecklistItem[] = [];
const NO_EXPENSES: Expense[] = [];

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : undefined);

/** Backend room -> the dashboard's view model. */
function toGala(r: RoomDto): Gala {
  const days = daysBetween(r.startDate, r.endDate);
  return {
    title: r.title,
    code: normCode(r.roomCode),
    pw: '',
    dest: r.destination,
    date: formatDay(r.startDate),
    range: formatRange(r.startDate, days),
    time: formatTimes(hhmm(r.startTime), hhmm(r.endTime)),
    dateISO: r.startDate,
    startTime: hhmm(r.startTime),
    days,
  };
}

const subscribeOnline = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};

const noRetryOn4xx = (n: number, e: unknown) => !(isApiError(e) && e.status >= 400 && e.status < 500) && n < 2;

export function GalaProvider({ code, children }: { code: string; children: ReactNode }) {
  const valid = isValidCode(code);
  const qc = useQueryClient();

  // undefined on the server and during hydration -> "loading"; then the id or null.
  const roomId = useSyncExternalStore(
    subscribeRooms,
    () => (valid ? roomIdFor(code) : null),
    () => undefined
  );
  const enabled = !!roomId;
  const live = { enabled, retry: noRetryOn4xx, refetchInterval: 15_000 } as const;

  const roomQ = useQuery({ queryKey: ['room', roomId], queryFn: () => getRoom(roomId!), ...live });
  const membersQ = useQuery({ queryKey: ['room', roomId, 'members'], queryFn: () => getAllMembers(roomId!), ...live });
  const summaryQ = useQuery({ queryKey: ['room', roomId, 'summary'], queryFn: () => getSummary(roomId!), ...live });
  const userQ = useQuery({ queryKey: ['me'], queryFn: currentUserId, enabled, staleTime: Infinity });

  // The backend says this device isn't in the gala (removed, left, or someone reclaimed
  // the member): forget the stale room id so the gate sends me to Enter a Gala.
  const notMember = isApiError(roomQ.error) && (roomQ.error.status === 403 || roomQ.error.code === 'NOT_A_ROOM_MEMBER');
  useEffect(() => {
    if (notMember) forgetRoom(code);
  }, [notMember, code]);

  const room = roomQ.data;
  const myUserId = userQ.data ?? null;

  // Overrides (dev switcher / local edits). null = use the value from the backend.
  const [roleOverride, setRole] = useState<Role | null>(null);
  const [phaseOverride, setPhase] = useState<Phase | null>(null);
  const [accountOverride, setHasAccount] = useState<boolean | null>(null);
  const [stopsEdit, setStops] = useState<Stop[] | null>(null);
  const [itemsEdit, setItems] = useState<ChecklistItem[] | null>(null);
  const [budgetEdit, setBudget] = useState<Budget | null>(null);
  const [expensesEdit, setExpenses] = useState<Expense[] | null>(null);
  const [unreadEdit, setUnread] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const [viewState, setViewState] = useState<ViewState>('default');
  const [bannerOpen, setBannerOpen] = useState(true);
  // My RSVP shown right away while PATCH /members/me/rsvp is in flight (cleared once the refetch lands).
  const [statusOverride, setStatusOverride] = useState<AttendanceKey | null>(null);

  const rows = useMemo(() => membersQ.data ?? [], [membersQ.data]);
  const mine = rows.find((m) => m.userId === myUserId);

  const members = useMemo<Member[]>(
    () =>
      rows.map((m, i) => ({
        n: m.nickname,
        c: TONES[i % TONES.length],
        s: m.userId === myUserId && statusOverride ? statusOverride : ATTEND[m.rsvpStatus],
        on: m.userId === myUserId ? 1 : 0,
        role: m.role === 'HOST' ? 'leader' : 'member',
      })),
    [rows, myUserId, statusOverride]
  );

  const myName = mine?.nickname ?? '';
  const myStatus: AttendanceKey = statusOverride ?? (mine ? ATTEND[mine.rsvpStatus] : 'm');
  const role: Role = roleOverride ?? (room?.myRole === 'HOST' ? 'leader' : 'member');
  const phase: Phase = phaseOverride ?? (room ? PHASE[room.phase] : 'planning');
  const hasAccount = accountOverride ?? !!mine?.hasAccount;
  const summary = summaryQ.data ?? null;
  const stops = stopsEdit ?? NO_STOPS;
  const items = itemsEdit ?? NO_ITEMS;
  const budget = useMemo<Budget>(
    () => budgetEdit ?? { tr: 0, st: 0, fo: 0, ac: 0, ot: 0, n: Math.max(1, members.length) },
    [budgetEdit, members.length]
  );
  const expenses = expensesEdit ?? NO_EXPENSES;
  const unread = unreadEdit ?? summary?.unreadChat ?? 0;

  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const liveState: ViewState = !summaryQ.data
    ? summaryQ.isError
      ? 'error'
      : 'loading'
    : !online || summaryQ.isError || roomQ.isError || membersQ.isError
      ? 'offline'
      : 'default';

  const retry = useCallback(async () => {
    if (!roomId) return false;
    await qc.invalidateQueries({ queryKey: ['room', roomId] });
    return qc.getQueryState(['room', roomId, 'summary'])?.status === 'success';
  }, [roomId, qc]);

  const firstError = roomQ.error ?? membersQ.error;
  const status: LoadStatus =
    roomId === undefined
      ? 'loading'
      : !valid || (isApiError(roomQ.error) && roomQ.error.status === 404)
        ? 'missing'
        : roomId === null || notMember
          ? 'guest'
          : firstError
            ? 'error'
            : room && membersQ.data && userQ.isSuccess
              ? 'ready'
              : 'loading';
  const error = firstError instanceof Error ? firstError.message : '';

  const setMyStatus = useCallback(
    (s: AttendanceKey) => {
      if (!roomId) return;
      setStatusOverride(s); // instant: card counts, "Who's in" and the status control update now
      updateRsvp(roomId, RSVP[s])
        .then(() => qc.invalidateQueries({ queryKey: ['room', roomId] }))
        .catch((e: unknown) => toast(e instanceof Error ? e.message : "Couldn't update your status.", 'err'))
        .finally(() => setStatusOverride(null)); // back to the server value (new on success, old on failure)
    },
    [roomId, qc]
  );

  const gala = useMemo<Gala>(
    () => (room ? toGala(room) : { title: '', code: normCode(code), pw: '', dest: '', date: '', range: '', time: '' }),
    [room, code]
  );

  const value = useMemo<GalaState>(
    () => ({
      status,
      error,
      roomId: roomId ?? null,
      gala,
      members,
      summary,
      me: myName,
      role,
      phase,
      hasAccount,
      myStatus,
      stops,
      items,
      budget,
      expenses,
      unread,
      sheet,
      viewState,
      liveState,
      retry,
      bannerOpen,
      setRole,
      setPhase,
      setHasAccount,
      setMyStatus,
      setStops,
      setItems,
      setBudget,
      setExpenses,
      setUnread,
      openSheet: setSheet,
      closeSheet: () => setSheet(null),
      setViewState,
      dismissBanner: () => setBannerOpen(false),
    }),
    [status, error, roomId, gala, members, summary, myName, role, phase, hasAccount, myStatus, stops, items, budget, expenses, unread, sheet, viewState, liveState, retry, bannerOpen, setMyStatus]
  );

  return <GalaContext.Provider value={value}>{children}</GalaContext.Provider>;
}

export function useGala(): GalaState {
  const ctx = useContext(GalaContext);
  if (!ctx) throw new Error('useGala must be used inside <GalaProvider> (the /gala/[code] layout).');
  return ctx;
}
