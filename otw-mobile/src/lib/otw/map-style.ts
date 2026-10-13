/**
 * Map styles, same as the web (otw-client/src/lib/otw/maplibre.ts): free OpenFreeMap vector styles
 * (no API key). Liberty in light mode, and Liberty recoloured Apple Maps–style at night.
 */
import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { useSyncExternalStore } from 'react';
import { useTheme } from '@/theme/ThemeProvider';

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

/** The night style, built once per app run from Liberty; null until it has loaded. */
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
  return () => {
    nightListeners.delete(cb);
  };
}

/**
 * The map style for the theme that is showing. Dark mode uses the Apple Maps–like night style
 * (OpenFreeMap's dark style shows for a moment while it loads, or for good if it can't).
 */
export function useMapStyle(): string | StyleSpecification {
  const dark = useSyncExternalStore(subscribeNight, () => night);
  return useTheme().scheme === 'dark' ? (dark ?? STYLE.dark) : STYLE.light;
}
