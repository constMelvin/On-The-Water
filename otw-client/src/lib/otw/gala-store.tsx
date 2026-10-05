'use client';

/**
 * Gala state for everything inside /gala/[code], loaded from the OTW backend:
 * GET /rooms/{id}, /rooms/{id}/members and /rooms/{id}/summary. The room id comes from
 * this device's code -> roomId map (written by Plan / Join / Enter a Gala); "me" is the
 * member row whose userId is this device's Supabase user.
 * Data refreshes live over the room:{roomId} realtime channel (lib/otw/live.ts), and falls
 * back to polling every 15 s (plus on window focus) while that channel is down.
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
import type { AttendanceKey, Gala, Member, Tone } from './data';
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
import { POLL_MS, featureKey, roomKey, useRoomRealtime } from './live';
import { isApiError } from '@/lib/api/client';
import { currentUserId } from '@/lib/api/supabase';
import {
  getAllMembers,
  getRoom,
  getSummary,
  updateRsvp,
  type GalaPhase,
  type RoomDto,
  type RoomMemberDto,
  type RoomSummaryDto,
  type RsvpStatus,
} from '@/lib/api/rooms';

export type Role = 'leader' | 'member';
export type Phase = 'planning' | 'day' | 'done';
/**
 * Shell sheets. `'account'` is @deprecated: the optional "Save this gala" sheet is gone
 * now that an account is required to plan or join. Nothing renders it; delete it after
 * the feature lanes merge.
 */
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
  /** The room as the backend sent it (permissions, dates, type, meeting point); null until loaded. */
  room: RoomDto | null;
  /** My Supabase user id (= RoomMemberDto.userId), null until the session is read. */
  myUserId: string | null;
  /** True while the realtime channel is connected (otherwise the queries poll). */
  live: boolean;
  gala: Gala;
  members: Member[];
  /** The raw active member rows, for anything keyed by userId. */
  memberRows: RoomMemberDto[];
  /** Nickname for a userId ("Former member" for someone who left). */
  nameOf: (userId: string | null | undefined) => string;
  /** Avatar tone for a userId. */
  toneOf: (userId: string | null | undefined) => Tone | undefined;
  /** Counts for the dashboard cards, straight from GET /summary (null until loaded). */
  summary: RoomSummaryDto | null;
  /** My display name in this gala. */
  me: string;
  role: Role;
  phase: Phase;
  /**
   * @deprecated Account-optional leftover. Everyone who plans or joins now has an account,
   * so nothing should branch on this. Delete after the feature lanes merge.
   */
  hasAccount: boolean;
  myStatus: AttendanceKey;
  /** Unread chat messages (drives the Chismis / Chat badge). */
  unread: number;
  /** Which shell sheet is open, if any. */
  sheet: SheetKey | null;
  viewState: ViewState;
  /** Real screen state from the live queries: loading / error / offline (stale data) / default. The dev switcher's viewState wins over it. */
  liveState: ViewState;
  /** Refetches the gala (room, members, summary): the "Try again" action. Resolves true when the refetch worked. */
  retry: () => Promise<boolean>;
  /**
   * @deprecated The dashboard's "keep your gala with you" account banner was removed.
   * Nothing reads this. Delete after the feature lanes merge.
   */
  bannerOpen: boolean;

  /** Dev switcher override; the real role comes from the backend. */
  setRole: (role: Role) => void;
  /** Dev switcher override; the real phase comes from the backend. */
  setPhase: (phase: Phase) => void;
  /** @deprecated Dev-switcher override for `hasAccount`; no longer used. Delete with `hasAccount`. */
  setHasAccount: (v: boolean) => void;
  /** PATCH /members/me/rsvp, then refreshes members + summary. */
  setMyStatus: (status: AttendanceKey) => void;
  setUnread: (v: number) => void;
  openSheet: (key: SheetKey) => void;
  closeSheet: () => void;
  setViewState: (v: ViewState) => void;
  /** @deprecated See `bannerOpen`. Delete after the feature lanes merge. */
  dismissBanner: () => void;
}

const GalaContext = createContext<GalaState | null>(null);

const TONES: Tone[] = ['rosy', 'teal', 'zest', 'blossom'];
const PHASE: Record<GalaPhase, Phase> = { PLANNING: 'planning', GALA_DAY: 'day', DONE: 'done' };
/** PENDING (hasn't answered yet) shows as Maybe: the dashboard only has three states. */
const ATTEND: Record<RsvpStatus, AttendanceKey> = { GOING: 'g', MAYBE: 'm', NOT_GOING: 'x', PENDING: 'm' };
const RSVP: Record<AttendanceKey, RsvpStatus> = { g: 'GOING', m: 'MAYBE', x: 'NOT_GOING' };

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
  const { live, online: present } = useRoomRealtime(roomId);
  // Realtime pushes changes; the slow poll only catches the date-driven phase change.
  const opts = { enabled, retry: noRetryOn4xx, refetchInterval: live ? 60_000 : POLL_MS } as const;

  const roomQ = useQuery({ queryKey: roomKey(roomId ?? null), queryFn: () => getRoom(roomId!), ...opts });
  const membersQ = useQuery({ queryKey: featureKey(roomId ?? null, 'members'), queryFn: () => getAllMembers(roomId!), ...opts });
  const summaryQ = useQuery({ queryKey: featureKey(roomId ?? null, 'summary'), queryFn: () => getSummary(roomId!), ...opts });
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
        id: m.userId,
        n: m.nickname,
        c: TONES[i % TONES.length],
        s: m.userId === myUserId && statusOverride ? statusOverride : ATTEND[m.rsvpStatus],
        on: m.userId === myUserId || present.has(m.userId) ? 1 : 0,
        role: m.role === 'HOST' ? 'leader' : 'member',
      })),
    [rows, myUserId, statusOverride, present]
  );

  const myName = mine?.nickname ?? '';
  const myStatus: AttendanceKey = statusOverride ?? (mine ? ATTEND[mine.rsvpStatus] : 'm');
  const role: Role = roleOverride ?? (room?.myRole === 'HOST' ? 'leader' : 'member');
  const phase: Phase = phaseOverride ?? (room ? PHASE[room.phase] : 'planning');
  const hasAccount = accountOverride ?? !!mine?.hasAccount;
  const summary = summaryQ.data ?? null;
  const nameOf = useCallback(
    (userId: string | null | undefined) =>
      !userId ? '' : (rows.find((m) => m.userId === userId)?.nickname ?? 'Former member'),
    [rows]
  );
  const toneOf = useCallback(
    (userId: string | null | undefined) => members.find((m) => m.id === userId)?.c,
    [members]
  );
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
    await qc.invalidateQueries({ queryKey: roomKey(roomId) });
    return qc.getQueryState(featureKey(roomId, 'summary'))?.status === 'success';
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
        .then(() => qc.invalidateQueries({ queryKey: roomKey(roomId) }))
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
      room: room ?? null,
      myUserId,
      live,
      gala,
      members,
      memberRows: rows,
      nameOf,
      toneOf,
      summary,
      me: myName,
      role,
      phase,
      hasAccount,
      myStatus,
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
      setUnread,
      openSheet: setSheet,
      closeSheet: () => setSheet(null),
      setViewState,
      dismissBanner: () => setBannerOpen(false),
    }),
    [status, error, roomId, room, myUserId, live, gala, members, rows, nameOf, toneOf, summary, myName, role, phase, hasAccount, myStatus, unread, sheet, viewState, liveState, retry, bannerOpen, setMyStatus]
  );

  return <GalaContext.Provider value={value}>{children}</GalaContext.Provider>;
}

export function useGala(): GalaState {
  const ctx = useContext(GalaContext);
  if (!ctx) throw new Error('useGala must be used inside <GalaProvider> (the /gala/[code] layout).');
  return ctx;
}
