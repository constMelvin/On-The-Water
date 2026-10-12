'use client';

/**
 * Shared MapLibre GL setup for every map (Who's OTW?, Pick on map). Free OpenFreeMap vector
 * styles (no API key): Liberty in light mode and Liberty recoloured Apple Maps–style at night,
 * following the app theme, and the web worker
 * served from our own origin (public/maplibre-gl-worker.mjs, copied by scripts/copy-maplibre-worker.mjs).
 */
import { useSyncExternalStore } from 'react';
import { setWorkerUrl, type Map as MlMap, type StyleSpecification } from 'maplibre-gl';
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

/** Apple Maps–like night palette, painted over the Liberty style. */
const NIGHT = {
  land: '#242528',
  urban: '#2a2b2e',
  park: '#1f3326',
  wood: '#1d2d22',
  water: '#14212f',
  building: '#323337',
  road: '#3c3d42',
  roadMajor: '#4e4f55',
  motorway: '#8a6d43',
  motorwayCasing: '#5b4a30',
  casing: '#1c1d20',
  path: '#4a4b50',
  rail: '#46474c',
  boundary: '#5c5c61',
  label: '#e5e5ea',
  labelSoft: '#a1a1a6',
  waterLabel: '#6f93bd',
  halo: '#1c1c1e',
} as const;

type Layer = StyleSpecification['layers'][number];

function setPaint(l: Layer, key: string, value: unknown) {
  (l as { paint?: Record<string, unknown> }).paint = { ...('paint' in l ? l.paint : {}), [key]: value };
}

function lineColor(id: string): string {
  if (id.startsWith('waterway')) return NIGHT.water;
  if (id === 'park_outline') return NIGHT.park;
  if (id.startsWith('aeroway')) return NIGHT.road;
  if (id.startsWith('boundary')) return NIGHT.boundary;
  if (id.includes('rail')) return NIGHT.rail;
  if (id.includes('casing')) return id.includes('motorway') ? NIGHT.motorwayCasing : NIGHT.casing;
  if (id.includes('path_pedestrian')) return NIGHT.path;
  if (id.includes('motorway')) return NIGHT.motorway;
  if (/trunk_primary|secondary_tertiary|_link/.test(id)) return NIGHT.roadMajor;
  return NIGHT.road;
}

function fillColor(id: string): string | null {
  if (id === 'water') return NIGHT.water;
  if (id === 'park') return NIGHT.park;
  if (id === 'landcover_wood' || id === 'landcover_grass') return NIGHT.wood;
  if (id === 'landcover_ice') return '#2c3138';
  if (id === 'landcover_sand') return '#2e2b24';
  if (id === 'landuse_residential') return NIGHT.urban;
  if (id === 'landuse_hospital') return '#36282c';
  if (id === 'landuse_school') return '#2c2b26';
  if (id.startsWith('landuse_')) return '#22302a';
  if (id === 'aeroway_fill') return '#2e2f33';
  if (id === 'building') return NIGHT.building;
  return null;
}

/** Recolours the Liberty style (same roads, labels and icons) into the night palette. */
function toNight(style: StyleSpecification): StyleSpecification {
  for (const l of style.layers) {
    switch (l.type) {
      case 'background':
        setPaint(l, 'background-color', NIGHT.land);
        break;
      case 'raster': // light shaded-relief imagery at low zoom
        l.layout = { ...l.layout, visibility: 'none' };
        break;
      case 'fill': {
        const color = fillColor(l.id);
        if (color) {
          setPaint(l, 'fill-color', color);
          setPaint(l, 'fill-outline-color', l.id === 'building' ? NIGHT.urban : color);
        } else if (l.paint && 'fill-pattern' in l.paint) {
          setPaint(l, 'fill-opacity', 0.15); // wetland / pedestrian-area textures are drawn light
        }
        break;
      }
      case 'fill-extrusion':
        setPaint(l, 'fill-extrusion-color', NIGHT.building);
        break;
      case 'line':
        setPaint(l, 'line-color', lineColor(l.id));
        break;
      case 'symbol':
        if (l.paint && 'text-color' in l.paint) {
          const water = l.id.startsWith('water');
          setPaint(l, 'text-color', water ? NIGHT.waterLabel : l.id.startsWith('label_') ? NIGHT.label : NIGHT.labelSoft);
          setPaint(l, 'text-halo-color', NIGHT.halo);
        }
        break;
    }
  }
  return style;
}

/** The night style, built once per page from Liberty; null until it has loaded. */
let night: StyleSpecification | null = null;
let nightLoading = false;
const nightListeners = new Set<() => void>();

function subscribeNight(cb: () => void) {
  nightListeners.add(cb);
  if (!night && !nightLoading) {
    nightLoading = true;
    fetch(STYLE.light)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`map style ${r.status}`))))
      .then((s: StyleSpecification) => {
        night = toNight(s);
        nightListeners.forEach((l) => l());
      })
      .catch(() => {
        nightLoading = false; // keep OpenFreeMap's own dark style; try again on the next map
      });
  }
  return () => nightListeners.delete(cb);
}

/**
 * The map style for the theme that is showing. Dark mode uses the Apple Maps–like night style
 * (OpenFreeMap's dark style shows for a moment while it loads, or for good if it can't).
 */
export function useMapStyle(): string | StyleSpecification {
  const dark = useSyncExternalStore(subscribeNight, () => night, () => null);
  return useTheme().resolved === 'dark' ? (dark ?? STYLE.dark) : STYLE.light;
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
