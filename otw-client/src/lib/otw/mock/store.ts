'use client';

/**
 * Per-room mock store for the gala tabs (B0). Frontend only: each feature keeps its slice
 * here until its real endpoint is wired, then the slice is swapped for a query.
 *
 * - One slice per feature, defined in its own lib/otw/mock/<feature>.ts with defineSlice().
 *   Feature files never edit this file.
 * - Keyed by the normalized gala code (the URL has it right away; the room id loads later).
 * - Persisted to localStorage as otw:mock:v1:{CODE}:{key} (never throws; falls back to memory).
 * - BroadcastChannel('otw-mock') tells other tabs to re-read, so two tabs stay in sync.
 * - get/subscribe fit React's useSyncExternalStore; useSlice() wraps that.
 *
 * Seeding: only the demo gala (DEMO_CODE) starts with the Baguio reference data. Every
 * other room starts empty, so the empty states show and no fake names appear.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { normCode } from '../gala-registry';

// TODO(backend): remove demo seed before production.
/** The one demo gala that gets the Baguio reference data. Every other room starts empty. */
export const DEMO_CODE = 'OTW-7K2P';

export const isDemo = (code: string): boolean => roomKey(code) === roomKey(DEMO_CODE);

export interface SliceDef<T> {
  /** Unique per feature, e.g. 'checklist'. Part of the storage key. */
  key: string;
  /** Bump when T changes shape: older persisted data is dropped and re-seeded. */
  version: number;
  /** Starting value for a brand-new (real) room. */
  empty: () => T;
  /** Starting value for the demo gala (DEMO_CODE). */
  demo: () => T;
}

export type Updater<T> = T | ((prev: T) => T);

export interface Slice<T> {
  key: string;
  /** Current value. Same reference until the next set (required by useSyncExternalStore). */
  get(code: string): T;
  /** Saves, re-renders subscribers here, and tells other tabs. */
  set(code: string, next: Updater<T>): void;
  /** Back to the starting value (the demo gala re-seeds to the Baguio data). */
  reset(code: string): void;
  subscribe(code: string, cb: () => void): () => void;
}

/* ---------------- internals ---------------- */

const PREFIX = 'otw:mock:v1:';
const CHANNEL = 'otw-mock';

interface Stored<T> {
  v: number;
  data: T;
}

interface Entry {
  get(code: string): unknown;
  set(code: string, value: unknown): void;
  reset(code: string): void;
  /** Drops the cached value so the next get re-reads storage (another tab changed it). */
  invalidate(code: string): void;
}

const registry = new Map<string, Entry>();
/** Server/hydration snapshot per slice: the starting value, so hydration always matches. */
const serverSnapshots = new WeakMap<Slice<unknown>, (code: string) => unknown>();
const listeners = new Map<string, Set<() => void>>();

function roomKey(code: string): string {
  return normCode(code);
}

const storageKey = (code: string, key: string) => `${PREFIX}${roomKey(code)}:${key}`;
const listenerKey = (code: string, key: string) => `${roomKey(code)}|${key}`;

function readStorage<T>(code: string, key: string, version: number): T | undefined {
  try {
    const raw = window.localStorage.getItem(storageKey(code, key));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Stored<T>;
    return parsed && parsed.v === version ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function writeStorage<T>(code: string, key: string, version: number, data: T): void {
  try {
    window.localStorage.setItem(storageKey(code, key), JSON.stringify({ v: version, data } satisfies Stored<T>));
  } catch {
    // Quota or private mode: the value still lives in memory for this tab.
  }
}

function removeStorage(code: string, key: string): void {
  try {
    window.localStorage.removeItem(storageKey(code, key));
  } catch {
    // ignore
  }
}

function notify(code: string, key: string): void {
  listeners.get(listenerKey(code, key))?.forEach((cb) => cb());
}

let channel: BroadcastChannel | null | undefined;

function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  channel = null;
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return channel;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e: MessageEvent<{ code: string; key: string }>) => {
      const { code, key } = e.data ?? {};
      const entry = registry.get(key);
      if (!code || !entry) return;
      entry.invalidate(code);
      notify(code, key);
    };
  } catch {
    channel = null;
  }
  return channel;
}

function broadcast(code: string, key: string): void {
  try {
    getChannel()?.postMessage({ code: roomKey(code), key });
  } catch {
    // ignore: other tabs just won't sync
  }
}

/* ---------------- public API ---------------- */

/**
 * Registers a feature slice. Call once at module level in lib/otw/mock/<feature>.ts.
 * Keys must be unique per feature. A second definition with the same key replaces the
 * first (that is how Fast Refresh re-runs a module), so pick a key nobody else uses.
 */
export function defineSlice<T>(def: SliceDef<T>): Slice<T> {
  const { key, version } = def;

  const cache = new Map<string, T>();
  /** Server/hydration snapshots, cached so the reference is stable. */
  const initial = new Map<string, T>();

  const start = (code: string): T => {
    const k = roomKey(code);
    let v = initial.get(k);
    if (v === undefined) {
      v = isDemo(code) ? def.demo() : def.empty();
      initial.set(k, v);
    }
    return v;
  };

  const slice: Slice<T> = {
    key,
    get(code) {
      const k = roomKey(code);
      if (cache.has(k)) return cache.get(k) as T;
      if (typeof window === 'undefined') return start(code);
      getChannel();
      const v = readStorage<T>(code, key, version) ?? start(code);
      cache.set(k, v);
      return v;
    },
    set(code, next) {
      const prev = slice.get(code);
      const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      if (Object.is(value, prev)) return;
      cache.set(roomKey(code), value);
      writeStorage(code, key, version, value);
      notify(code, key);
      broadcast(code, key);
    },
    reset(code) {
      const k = roomKey(code);
      initial.delete(k);
      cache.delete(k);
      removeStorage(code, key);
      notify(code, key);
      broadcast(code, key);
    },
    subscribe(code, cb) {
      getChannel();
      const lk = listenerKey(code, key);
      let set = listeners.get(lk);
      if (!set) listeners.set(lk, (set = new Set()));
      set.add(cb);
      return () => {
        set.delete(cb);
        if (!set.size) listeners.delete(lk);
      };
    },
  };

  registry.set(key, {
    get: (code) => slice.get(code),
    set: (code, value) => slice.set(code, value as T),
    reset: (code) => slice.reset(code),
    invalidate: (code) => cache.delete(roomKey(code)),
  });
  serverSnapshots.set(slice as Slice<unknown>, start);
  return slice;
}

/** React hook: the slice value for this gala plus a setter bound to it. Re-renders on any change, in any tab. */
export function useSlice<T>(slice: Slice<T>, code: string): [T, (next: Updater<T>) => void] {
  const subscribe = useCallback((cb: () => void) => slice.subscribe(code, cb), [slice, code]);
  const server = serverSnapshots.get(slice as Slice<unknown>) as (code: string) => T;
  // Server + hydration render the starting value; React then re-renders with the stored one.
  const value = useSyncExternalStore(
    subscribe,
    () => slice.get(code),
    () => server(code)
  );
  const set = useCallback((next: Updater<T>) => slice.set(code, next), [slice, code]);
  return [value, set];
}

/** Resets every registered slice for this gala. The demo gala re-seeds to the Baguio data. */
export function resetRoom(code: string): void {
  registry.forEach((entry) => entry.reset(code));
}

/** Ids for rows created in the mock (the backend uses UUIDs). */
export const mockId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ---------------- dev handle ---------------- */

declare global {
  interface Window {
    /** Dev only: poke the mock store from the console (see B0 notes). */
    otwMock?: {
      DEMO_CODE: string;
      keys: () => string[];
      get: (code: string, key: string) => unknown;
      set: (code: string, key: string, value: unknown) => void;
      reset: (code: string, key?: string) => void;
      /** Logs the slice every time it changes (in this tab or another). Returns an unsubscribe. */
      watch: (code: string, key: string) => () => void;
    };
  }
}

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  getChannel(); // listen for other tabs even before any component subscribes
  window.otwMock = {
    DEMO_CODE,
    keys: () => [...registry.keys()],
    watch: (code, key) => {
      const lk = listenerKey(code, key);
      const cb = () => console.log(`[otwMock] ${roomKey(code)} ${key} changed:`, registry.get(key)?.get(code));
      let set = listeners.get(lk);
      if (!set) listeners.set(lk, (set = new Set()));
      set.add(cb);
      return () => set.delete(cb);
    },
    get: (code, key) => registry.get(key)?.get(code),
    set: (code, key, value) => {
      const entry = registry.get(key);
      if (!entry) throw new Error(`No mock slice "${key}". Try otwMock.keys().`);
      entry.set(code, value);
    },
    reset: (code, key) => (key ? registry.get(key)?.reset(code) : resetRoom(code)),
  };
}
