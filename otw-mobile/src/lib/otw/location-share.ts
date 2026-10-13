/**
 * Live location sharing for one gala at a time (mobile port of the web's location-share.ts, using expo-location,
 * foreground only). Lives at module level so it keeps sending while the person moves between tabs: the server
 * expires a LIVE location 2 minutes after the last update.
 *
 * Sends the first fix right away, then at most every 15 s while moving, and a heartbeat every 60 s with the
 * last known position. Stops on stop(), or when the server refuses (sharing turned off / gala over).
 */
import * as Location from 'expo-location';
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
let watch: Location.LocationSubscription | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let last: { lat: number; lng: number } | null = null;
let lastSent = 0;
const listeners = new Set<() => void>();

function set(next: ShareState) {
  state = next;
  listeners.forEach((l) => l());
}

function clear() {
  watch?.remove();
  if (heartbeat) clearInterval(heartbeat);
  watch = null;
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

/** Starts sharing this phone's live location with `roomId` (asks for permission first). */
export function startSharing(roomId: string): void {
  if ((state.status === 'on' || state.status === 'starting') && state.roomId === roomId) return;
  clear();
  set({ status: 'starting', roomId });
  void (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return set({ status: 'denied', roomId });
    // Android: with the phone's Location switched off, watchPositionAsync fails (permission alone isn't enough).
    if (!(await Location.hasServicesEnabledAsync().catch(() => true))) {
      return set({ status: 'error', roomId, message: 'Turn on Location in your phone settings, then try again.' });
    }
    try {
      watch = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 10_000, distanceInterval: 20 }, (pos) => {
        last = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (Date.now() - lastSent >= MIN_GAP_MS) void send(roomId);
      });
      heartbeat = setInterval(() => void send(roomId), HEARTBEAT_MS);
    } catch (e) {
      console.warn('[location-share] watchPositionAsync failed', e);
      clear();
      set({ status: 'error', roomId, message: "Couldn't get your location. Try again outside or near a window." });
    }
  })();
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
  return () => {
    listeners.delete(cb);
  };
};

/** Sharing state for this phone. */
export function useSharing(): ShareState {
  return useSyncExternalStore(subscribe, () => state);
}
