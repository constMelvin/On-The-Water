'use client';

/**
 * Gala state for everything inside /gala/[code]. Reads the REAL gala that Plan a Gala /
 * Join a Gala / Enter a Gala stored in the gala registry, plus who "I" am on this device,
 * and stays in sync when another tab changes it (e.g. a friend joins).
 * The demo data module is only a development fallback for the demo code.
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
import {
  BUD0,
  EXP0,
  G,
  ITEMS0,
  STOPS0,
  demoGalaRecord,
  type AttendanceKey,
  type Budget,
  type ChecklistItem,
  type Expense,
  type Gala,
  type Member,
  type Stop,
} from './data';
import {
  formatDay,
  formatRange,
  formatTimes,
  galaSnapshot,
  getGala,
  getCurrentMember,
  isValidCode,
  normCode,
  parseSnapshot,
  phaseFor,
  saveGala,
  setCurrentMember,
  setMemberStatus,
  subscribeGalas,
  type GalaRecord,
} from './gala-registry';

export type Role = 'leader' | 'member';
export type Phase = 'planning' | 'day' | 'done';
export type SheetKey = 'more' | 'share' | 'account';
/** Screen state for loading / empty / error / offline variants. */
export type ViewState = 'default' | 'loading' | 'empty' | 'error' | 'offline';
/** loading = reading storage; missing = unknown code; guest = gala exists but I'm not in it on this device. */
export type LoadStatus = 'loading' | 'missing' | 'guest' | 'ready';

export interface GalaState {
  status: LoadStatus;
  gala: Gala;
  members: Member[];
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
  /** The dashboard's account banner; dismissing hides it for the session. */
  bannerOpen: boolean;

  /** Dev switcher override; the real role comes from how I joined. */
  setRole: (role: Role) => void;
  /** Dev switcher override; the real phase comes from the gala date. */
  setPhase: (phase: Phase) => void;
  setHasAccount: (v: boolean) => void;
  /** Updates my attendance everywhere (and persists it for this gala). */
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

/** Registry record -> the dashboard's view model. */
function toGala(r: GalaRecord): Gala {
  return {
    title: r.title,
    code: r.code,
    pw: '',
    dest: r.destination,
    date: formatDay(r.date),
    range: formatRange(r.date, r.days),
    time: formatTimes(r.startTime, r.endTime),
    dateISO: r.date || undefined,
    startTime: r.startTime,
    days: r.days,
  };
}

export function GalaProvider({ code, children }: { code: string; children: ReactNode }) {
  const valid = isValidCode(code);

  // null on the server and during hydration -> "loading"; then the stored gala.
  const snap = useSyncExternalStore(
    subscribeGalas,
    () => (valid ? galaSnapshot(code) : 'invalid'),
    () => null
  );

  // Development only: the demo code works without creating a gala first.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || normCode(code) !== G.code || getGala(code)) return;
    const rec = saveGala(demoGalaRecord());
    if (!getCurrentMember(code)) setCurrentMember(code, { name: rec.members[0].name, role: 'leader' });
  }, [code]);

  const { rec, me } = useMemo(
    () => (snap && snap !== 'invalid' ? parseSnapshot(snap) : { rec: null, me: null }),
    [snap]
  );

  const status: LoadStatus =
    snap === null ? 'loading' : snap === 'invalid' || !rec ? 'missing' : !me ? 'guest' : 'ready';
  const demo = !!rec?.demo;

  // Overrides (dev switcher / local edits). null = use the value derived from the gala.
  const [roleOverride, setRole] = useState<Role | null>(null);
  const [phaseOverride, setPhase] = useState<Phase | null>(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [stopsEdit, setStops] = useState<Stop[] | null>(null);
  const [itemsEdit, setItems] = useState<ChecklistItem[] | null>(null);
  const [budgetEdit, setBudget] = useState<Budget | null>(null);
  const [expensesEdit, setExpenses] = useState<Expense[] | null>(null);
  const [unreadEdit, setUnread] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const [viewState, setViewState] = useState<ViewState>('default');
  const [bannerOpen, setBannerOpen] = useState(true);

  const members = useMemo<Member[]>(
    () => (rec ? rec.members.map((m) => ({ n: m.name, c: m.color, s: m.status, on: m.name === me?.name ? 1 : 0 })) : []),
    [rec, me]
  );
  const myName = me?.name ?? '';
  const myStatus: AttendanceKey = members.find((m) => m.n === myName)?.s ?? 'g';
  const role: Role = roleOverride ?? me?.role ?? 'member';
  const phase: Phase = phaseOverride ?? (rec && !demo ? phaseFor(rec.date, rec.days) : 'planning');
  const stops = stopsEdit ?? (demo ? STOPS0 : []);
  const items = itemsEdit ?? (demo ? ITEMS0 : []);
  const budget = budgetEdit ?? (demo ? BUD0 : { tr: 0, st: 0, fo: 0, ac: 0, ot: 0, n: Math.max(1, members.length) });
  const expenses = expensesEdit ?? (demo ? EXP0 : []);
  const unread = unreadEdit ?? (demo ? 2 : 0);

  const setMyStatus = useCallback((s: AttendanceKey) => setMemberStatus(code, myName, s), [code, myName]);

  const gala = useMemo<Gala>(
    () => (rec ? toGala(rec) : { title: '', code: normCode(code), pw: '', dest: '', date: '', range: '', time: '' }),
    [rec, code]
  );

  const value = useMemo<GalaState>(
    () => ({
      status,
      gala,
      members,
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
    [status, gala, members, myName, role, phase, hasAccount, myStatus, stops, items, budget, expenses, unread, sheet, viewState, bannerOpen, setMyStatus]
  );

  return <GalaContext.Provider value={value}>{children}</GalaContext.Provider>;
}

export function useGala(): GalaState {
  const ctx = useContext(GalaContext);
  if (!ctx) throw new Error('useGala must be used inside <GalaProvider> (the /gala/[code] layout).');
  return ctx;
}
