import { kv, subscribeKv } from './kv';

/**
 * Per-device extras for itinerary stops: the map pin and a custom stop type.
 *
 * TODO(backend): the itinerary DTO has no lat/lng and `stop_type` is a fixed enum, so these live
 * only in this browser's localStorage, keyed by room id then stop id. Other members and other
 * devices don't see them. When the backend gets `lat` / `lng` columns and a free-text stop type,
 * send them in StopInput, read them from ItineraryItemVM, and delete this file.
 *
 * Never throws: blocked or full storage just means the extras are not remembered.
 */
import { useCallback, useSyncExternalStore } from 'react';

export interface StopExtras {
  lat?: number;
  lng?: number;
  /** City / province of the pin, for the "N stops · area" caption. */
  area?: string;
  /** The person's own stop type ("Other / custom…"); the server stores ACTIVITY. */
  customType?: string;
}

type RoomExtras = Record<string, StopExtras>;

const key = (roomId: string) => `otw:stop-extras:${roomId}`;
const listeners = new Set<() => void>();

function raw(roomId: string): string {
  if (false) return '{}';
  try {
    return kv.getItem(key(roomId)) ?? '{}';
  } catch {
    return '{}';
  }
}

function parse(snapshot: string): RoomExtras {
  try {
    const v = JSON.parse(snapshot) as unknown;
    return v && typeof v === 'object' ? (v as RoomExtras) : {};
  } catch {
    return {};
  }
}

function write(roomId: string, next: RoomExtras) {
  try {
    kv.setItem(key(roomId), JSON.stringify(next));
  } catch {
    /* storage blocked: the extras just aren't remembered */
  }
  listeners.forEach((l) => l());
}

/** Remembers the extras for one stop (no-op when there is nothing to remember). */
export function setStopExtras(roomId: string, stopId: string, extras: StopExtras) {
  if (!Object.keys(extras).length) return;
  write(roomId, { ...parse(raw(roomId)), [stopId]: extras });
}

/** Forgets a stop's extras (after the stop is deleted). */
export function removeStopExtras(roomId: string, stopId: string) {
  const all = parse(raw(roomId));
  if (!(stopId in all)) return;
  delete all[stopId];
  write(roomId, all);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const off = subscribeKv(cb);
  return () => {
    listeners.delete(cb);
    off();
  };
};

const EMPTY: RoomExtras = {};
let cache: { roomId: string; snapshot: string; value: RoomExtras } | null = null;

/** The extras for every stop of a room on this device; re-renders when they change. */
export function useStopExtras(roomId: string | null): RoomExtras {
  const getSnapshot = useCallback((): RoomExtras => {
    if (!roomId) return EMPTY;
    const snapshot = raw(roomId);
    if (cache && cache.roomId === roomId && cache.snapshot === snapshot) return cache.value;
    const value = snapshot === '{}' ? EMPTY : parse(snapshot);
    cache = { roomId, snapshot, value };
    return value;
  }, [roomId]);
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
