'use client';

/**
 * Gala state for everything inside /gala/[code]. Seeded from the mock data module;
 * swap the initial values for API data later without touching consumers.
 */
import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
  BUD0,
  EXP0,
  G,
  ITEMS0,
  MEM,
  STOPS0,
  type AttendanceKey,
  type Budget,
  type ChecklistItem,
  type Expense,
  type Gala,
  type Member,
  type Stop,
} from './data';

export type Role = 'leader' | 'member';
export type Phase = 'planning' | 'day' | 'done';
export type SheetKey = 'more' | 'share' | 'account';
/** Screen state for loading / empty / error / offline variants. */
export type ViewState = 'default' | 'loading' | 'empty' | 'error' | 'offline';

type Set<T> = Dispatch<SetStateAction<T>>;

export interface GalaState {
  gala: Gala;
  members: Member[];
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

  setMembers: Set<Member[]>;
  setRole: Set<Role>;
  setPhase: Set<Phase>;
  setHasAccount: Set<boolean>;
  setMyStatus: Set<AttendanceKey>;
  setStops: Set<Stop[]>;
  setItems: Set<ChecklistItem[]>;
  setBudget: Set<Budget>;
  setExpenses: Set<Expense[]>;
  setUnread: Set<number>;
  openSheet: (key: SheetKey) => void;
  closeSheet: () => void;
  setViewState: Set<ViewState>;
  dismissBanner: () => void;
}

const GalaContext = createContext<GalaState | null>(null);

export function GalaProvider({ code, children }: { code: string; children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(() => MEM.map((m) => ({ ...m })));
  const [role, setRole] = useState<Role>('leader');
  const [phase, setPhase] = useState<Phase>('planning');
  const [hasAccount, setHasAccount] = useState(false);
  const [myStatus, setMyStatus] = useState<AttendanceKey>('g');
  const [stops, setStops] = useState<Stop[]>(() => STOPS0.map((s) => ({ ...s })));
  const [items, setItems] = useState<ChecklistItem[]>(() => ITEMS0.map((i) => ({ ...i })));
  const [budget, setBudget] = useState<Budget>(() => ({ ...BUD0 }));
  const [expenses, setExpenses] = useState<Expense[]>(() => EXP0.map((e) => ({ ...e })));
  const [unread, setUnread] = useState(2);
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const [viewState, setViewState] = useState<ViewState>('default');
  const [bannerOpen, setBannerOpen] = useState(true);

  const gala = useMemo<Gala>(() => ({ ...G, code: code || G.code }), [code]);

  const value = useMemo<GalaState>(
    () => ({
      gala,
      members,
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
      setMembers,
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
    [gala, members, role, phase, hasAccount, myStatus, stops, items, budget, expenses, unread, sheet, viewState, bannerOpen]
  );

  return <GalaContext.Provider value={value}>{children}</GalaContext.Provider>;
}

export function useGala(): GalaState {
  const ctx = useContext(GalaContext);
  if (!ctx) throw new Error('useGala must be used inside <GalaProvider> (the /gala/[code] layout).');
  return ctx;
}
