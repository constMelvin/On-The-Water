'use client';

/**
 * Shared MapLibre GL setup for every map (Who's OTW?, Pick on map). Free OpenFreeMap vector
 * styles (no API key), a light and a dark style that follow the app theme, and the web worker
 * served from our own origin (public/maplibre-gl-worker.mjs, copied by scripts/copy-maplibre-worker.mjs).
 */
import { useSyncExternalStore } from 'react';
import { setWorkerUrl, type Map as MlMap } from 'maplibre-gl';
import { useTheme } from './theme';

let ready = false;

/** Points MapLibre at the same-origin worker. Call before creating the first map. */
export function setupMapLibre() {
  if (ready) return;
  ready = true;
  setWorkerUrl(new URL('/maplibre-gl-worker.mjs', window.location.origin).href);
}

/**
 * The compact credit starts open and would cover a small map: fold it to its (i) button once the
 * map has loaded. The full credit is still one tap away.
 */
export function foldAttribution(m: MlMap) {
  m.once('load', () => {
    m.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  });
}

const STYLE = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

/** The map style for the theme that is showing. */
export function useMapStyle(): string {
  return STYLE[useTheme().resolved];
}

/** Metro Manila, [lng, lat] (MapLibre order), when there's nothing to show yet. */
export const MANILA: [number, number] = [120.9842, 14.5995];

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const prefersCalm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True when the person prefers reduced motion (maps jump instead of gliding). */
export function useCalm(): boolean {
  return useSyncExternalStore(subscribeMotion, prefersCalm, () => false);
}
