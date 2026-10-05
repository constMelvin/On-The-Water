'use client';

/**
 * Live location sharing for one gala at a time. Lives at module level (not in the map screen) so
 * it keeps sending while the person moves between tabs: the server expires a LIVE location
 * 2 minutes after the last update (and closes sharing 3 hours after the gala ends).
 *
 * Sends the first fix right away, then at most every 15 s while moving, and a heartbeat every
 * 60 s with the last known position. Stops on stop(), on sign-out of the tab, or when the
 * server refuses (sharing turned off by the Gala Leader / gala over).
 */
import { useSyncExternalStore } from 'react';
import { shareLocation, stopSharingLocation } from '@/lib/api/gala';
import { isApiError } from '@/lib/api/client';

export type ShareState =
  | { status: 'off' }
  | { status: 'starting'; roomId: string }
  | { status: 'on'; roomId: string }
  | { status: 'denied'; roomId: string }
  | { status: 'error'; roomId: string; message: string };

const MIN_GAP_MS = 15_000;
const HEARTBEAT_MS = 60_000;

let state: ShareState = { status: 'off' };
let watchId: number | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let last: { lat: number; lng: number } | null = null;
let lastSent = 0;
const listeners = new Set<() => void>();

function set(next: ShareState) {
  state = next;
  listeners.forEach((l) => l());
}

function clear() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  if (heartbeat) clearInterval(heartbeat);
  watchId = null;
  heartbeat = null;
  last = null;
  lastSent = 0;
}

async function send(roomId: string) {
  if (!last) return;
  lastSent = Date.now();
  try {
    await shareLocation(roomId, last.lat, last.lng, 'LIVE');
    if (state.status === 'starting') set({ status: 'on', roomId });
  } catch (e) {
    if (isApiError(e, 'TOO_MANY_REQUESTS') || isApiError(e, 'NETWORK')) return; // next tick retries
    clear();
    set({ status: 'error', roomId, message: e instanceof Error ? e.message : "Couldn't share your location." });
  }
}

/** Starts sharing this device's live location with `roomId` (asks the browser for permission). */
export function startSharing(roomId: string): void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    set({ status: 'error', roomId, message: "This browser can't share location." });
    return;
  }
  if ((state.status === 'on' || state.status === 'starting') && state.roomId === roomId) return;
  clear();
  set({ status: 'starting', roomId });
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      last = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (Date.now() - lastSent >= MIN_GAP_MS) void send(roomId);
    },
    (err) => {
      clear();
      set(
        err.code === err.PERMISSION_DENIED
          ? { status: 'denied', roomId }
          : { status: 'error', roomId, message: "Couldn't get your location. Try again outside or near a window." }
      );
    },
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
  );
  heartbeat = setInterval(() => void send(roomId), HEARTBEAT_MS);
}

/** Stops sharing and removes my location from the gala. */
export async function stopSharing(): Promise<void> {
  const roomId = state.status === 'off' ? null : state.roomId;
  clear();
  set({ status: 'off' });
  if (roomId) await stopSharingLocation(roomId).catch(() => undefined);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const OFF: ShareState = { status: 'off' };

/** Sharing state for this device ("off" on the server render). */
export function useSharing(): ShareState {
  return useSyncExternalStore(subscribe, () => state, () => OFF);
}
