import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Synchronous stand-in for the web's `window.localStorage`, so the web's device-only stores (code -> roomId map,
 * custom budget categories, stop extras) port unchanged. Values live in memory and are written through to
 * AsyncStorage; `hydrateKv()` loads every `otw:` key once at app start (app/_layout.tsx waits for it).
 */
const PREFIX = 'otw:';
const mem = new Map<string, string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

let hydrated: Promise<void> | null = null;

export function hydrateKv(): Promise<void> {
  hydrated ??= (async () => {
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [k, v] of pairs) if (v !== null && !mem.has(k)) mem.set(k, v);
    } catch {
      /* storage unreadable: start empty, the server is the source of truth */
    }
  })();
  return hydrated;
}

export const kv = {
  getItem(key: string): string | null {
    return mem.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    mem.set(key, value);
    AsyncStorage.setItem(key, value).catch(() => undefined);
    notify();
  },
  removeItem(key: string): void {
    mem.delete(key);
    AsyncStorage.removeItem(key).catch(() => undefined);
    notify();
  },
  /** Every `otw:` key (sign-out clears them). */
  clear(): void {
    const keys = [...mem.keys()];
    mem.clear();
    AsyncStorage.multiRemove(keys).catch(() => undefined);
    notify();
  },
};

/** Calls `cb` after any write (the web's `storage` event). */
export function subscribeKv(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
