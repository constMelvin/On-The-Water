'use client';

/**
 * MOCK account state for the "an account is required to plan or join" model.
 * Frontend only: localStorage stands in for a signed-in user. Nothing here talks to
 * Supabase or the backend, so it is not real security.
 *
 * Keys:
 * - otw:signed-in     -> { name, username, at } for the current session (older values were { name, at })
 * - otw:mock-accounts -> { [username]: name } so Log in can restore the Name given at Create
 *                        account. Passwords are never stored.
 *
 * TODO(backend): real Supabase session + sign-out. Replace with the Supabase session
 * (signUp / signInWithPassword, then check `!user.is_anonymous`, name + username in
 * user_metadata) and supabase.auth.signOut(); have the API reject anonymous sessions on
 * POST /rooms, /rooms/join and /rooms/enter.
 */
import { useMemo, useSyncExternalStore } from 'react';

export interface MockAccount {
  name: string;
  username: string;
}

export interface AccountState extends MockAccount {
  /** undefined during server render and hydration, then true / false. */
  signedIn: boolean | undefined;
}

const KEY = 'otw:signed-in';
const ACCOUNTS_KEY = 'otw:mock-accounts';
const listeners = new Set<() => void>();

/** Session kept in memory when storage is blocked (lasts until the page reloads). */
let memory: string | null = null;

/** Raw session string, or '' when signed out. A string so it is a stable snapshot. */
function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? memory ?? '';
  } catch {
    return memory ?? '';
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function readAccounts(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function rememberAccount(username: string, name: string) {
  if (!username || !name) return;
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify({ ...readAccounts(), [username.toLowerCase()]: name }));
  } catch {
    /* storage blocked: Log in falls back to the username as the name */
  }
}

/**
 * Marks this device as signed in (mock). Pass { name, username } (Create account) or
 * { name: '', username } (Log in: the Name saved at Create account is looked up).
 * A plain string is still accepted as the name, for older callers.
 */
export function mockSignIn(account: MockAccount | string = '') {
  const a: MockAccount = typeof account === 'string' ? { name: account, username: '' } : account;
  const username = a.username.trim();
  let name = a.name.trim();
  if (name) rememberAccount(username, name);
  else name = readAccounts()[username.toLowerCase()] ?? username;

  const value = JSON.stringify({ name, username, at: Date.now() });
  try {
    window.localStorage.setItem(KEY, value);
    memory = null;
  } catch {
    memory = value;
  }
  emit();
}

/** Clears the session only. Galas on this device (otw:rooms) and saved names stay. */
export function mockSignOut() {
  memory = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
};

/** Server render / hydration sentinel: "not read yet". */
const NOT_READ = '\u0000';

/** The signed-in account: { signedIn, name, username }. signedIn is undefined until known. */
export function useAccount(): AccountState {
  const raw = useSyncExternalStore(subscribe, readRaw, () => NOT_READ);
  return useMemo<AccountState>(() => {
    if (raw === NOT_READ) return { signedIn: undefined, name: '', username: '' };
    if (!raw) return { signedIn: false, name: '', username: '' };
    try {
      const v = JSON.parse(raw) as Partial<MockAccount>;
      return { signedIn: true, name: v.name ?? '', username: v.username ?? '' };
    } catch {
      return { signedIn: true, name: '', username: '' };
    }
  }, [raw]);
}

/**
 * true / false once known on the client; `undefined` during server render and
 * hydration so a guard never redirects before it has looked at localStorage.
 */
export function useSignedIn(): boolean | undefined {
  return useAccount().signedIn;
}
