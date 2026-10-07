'use client';

/**
 * "The plan" map: a real MapLibre map (OpenFreeMap tiles) with every pinned stop, numbered in plan
 * order, and the gala's destination, joined by a driving route stop 1 -> 2 -> ... -> destination
 * from the public OSRM server (router.project-osrm.org; browser-side, no key, nothing stored).
 * If OSRM can't be reached the stops are joined by a dashed straight line instead. Stops without a
 * pin are listed on the left but not drawn. Loaded with next/dynamic (ssr: false): MapLibre needs
 * `window` and WebGL.
 */
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { LngLatBounds, Map as MlMap, Marker, NavigationControl, type GeoJSONSource } from 'maplibre-gl';
import { Icon } from '@/components/otw';
import { IC } from '@/lib/otw/icons';
import { MANILA, foldAttribution, setupMapLibre, useCalm, useMapStyle } from '@/lib/otw/maplibre';
import type { StopType } from '@/lib/api/types';
import { metaFor } from './stop-style';
import s from './route-map.module.css';

export interface MapStop {
  id: string;
  /** 1-based place in the plan (stays the same whether or not earlier stops have a pin). */
  n: number;
  title: string;
  stopType: StopType;
  customType?: string;
  lat: number | null;
  lng: number | null;
}

export interface RouteMapProps {
  stops: MapStop[];
  destination: { lat: number; lng: number; label: string } | null;
  /** Caption area ("Baguio City, Benguet"). */
  area: string;
}

type LngLat = [number, number];

interface Leg {
  /** The line to draw. */
  coords: LngLat[];
  /** From OSRM; null for the straight-line fallback. */
  km: number | null;
  minutes: number | null;
}

const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
/** The public server allows at most 100 waypoints per request. */
const MAX_POINTS = 100;
/** Same route asked again (re-render, theme switch, coming back to the tab) is not refetched. */
const cache = new Map<string, Leg>();

async function fetchRoute(points: LngLat[], signal: AbortSignal): Promise<Leg> {
  const key = points.map(([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`).join(';');
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(`${OSRM}${key}?overview=full&geometries=geojson`, { signal });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const body = (await res.json()) as {
    code: string;
    routes?: { distance: number; duration: number; geometry: { coordinates: LngLat[] } }[];
  };
  const r = body.code === 'Ok' ? body.routes?.[0] : undefined;
  if (!r) throw new Error(`OSRM ${body.code}`);
  const leg = { coords: r.geometry.coordinates, km: r.distance / 1000, minutes: r.duration / 60 };
  cache.set(key, leg);
  return leg;
}

const SRC = 'otw-route';
const CASING = 'otw-route-casing';
const LINE = 'otw-route-line';

/** MapLibre paint can't read CSS variables: resolve the brand colours when drawing. */
function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Adds (or updates) the route line; called again after a style swap, which drops custom layers. */
function drawRoute(m: MlMap, leg: Leg | null, dashed: boolean) {
  const data = {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: leg?.coords ?? [] },
  };
  const src = m.getSource(SRC) as GeoJSONSource | undefined;
  if (src) src.setData(data);
  else {
    m.addSource(SRC, { type: 'geojson', data });
    m.addLayer({
      id: CASING,
      type: 'line',
      source: SRC,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': token('--cream', '#fff8f2'), 'line-width': 9 },
    });
    m.addLayer({
      id: LINE,
      type: 'line',
      source: SRC,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': token('--rosy', '#e0417c'), 'line-width': 5 },
    });
  }
  m.setPaintProperty(LINE, 'line-dasharray', dashed ? [1.5, 1.5] : [1, 0]);
}

function stopEl(st: MapStop): HTMLElement {
  const meta = metaFor(st.stopType, st.customType);
  const el = document.createElement('div');
  el.className = s.pinWrap;
  el.title = `${st.n}. ${st.title}`;
  el.innerHTML =
    `<span class="${s.pin}" style="--fill:${meta.fill};--ink:${meta.ink}">` +
    `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[meta.icon]}</svg>` +
    `<b class="${s.num}">${st.n}</b></span>`;
  return el;
}

function destEl(label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = s.pinWrap;
  el.title = label;
  el.innerHTML =
    `<span class="${s.dest}"><svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">` +
    `<path class="${s.destPin}" d="M12 22.5s-8-7.6-8-13a8 8 0 0 1 16 0c0 5.4-8 13-8 13z"/>` +
    `<path class="${s.destFlag}" d="M6 21V4M6 5h11l-2 4 2 4H6" transform="translate(6.6 3.6) scale(0.5)"/>` +
    `</svg><i class="${s.gtag}">Gala</i></span>`;
  return el;
}

function fmtTime(min: number): string {
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export default function RouteMap({ stops, destination, area }: RouteMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const drawn = useRef<{ leg: Leg | null; dashed: boolean }>({ leg: null, dashed: false });
  /** True once the current style can take layers (isStyleLoaded() also waits for every tile). */
  const styleReady = useRef(false);
  const style = useMapStyle();
  const calm = useCalm();
  const [leg, setLeg] = useState<Leg | null>(null);
  const [routeFailed, setRouteFailed] = useState(false);

  const pinned = stops.filter((st) => st.lat != null && st.lng != null);
  const points: LngLat[] = [
    ...pinned.map((st) => [st.lng as number, st.lat as number] as LngLat),
    ...(destination ? [[destination.lng, destination.lat] as LngLat] : []),
  ].slice(0, MAX_POINTS);
  const pointsKey = points.map((p) => p.join(',')).join(';');
  const markersKey = `${pointsKey}|${stops.map((st) => `${st.id}:${st.n}:${st.stopType}:${st.customType ?? ''}:${st.title}`).join('|')}|${destination?.label ?? ''}`;

  // Create the map once.
  useEffect(() => {
    if (!box.current) return;
    setupMapLibre();
    const m = new MlMap({
      container: box.current,
      style,
      center: points[0] ?? MANILA,
      zoom: points.length ? 11 : 5,
      attributionControl: { compact: true },
    });
    m.addControl(new NavigationControl({ showCompass: false }), 'top-left');
    foldAttribution(m);
    // A style swap (theme) drops custom layers: draw the route again once the new style is in.
    m.on('style.load', () => {
      styleReady.current = true;
      drawRoute(m, drawn.current.leg, drawn.current.dashed);
    });
    map.current = m;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    return () => {
      ro.disconnect();
      markers.current = [];
      map.current = null;
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; updates below
  }, []);

  // Theme switched: swap the style (markers are HTML, so they stay put).
  const shownStyle = useRef(style);
  useEffect(() => {
    if (!map.current || shownStyle.current === style) return;
    shownStyle.current = style;
    styleReady.current = false;
    map.current.setStyle(style);
  }, [style]);

  // Markers: rebuilt when a stop, its number, its look or its pin changes.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    if (destination) {
      markers.current.push(
        new Marker({ element: destEl(destination.label), anchor: 'bottom', offset: [0, 8] })
          .setLngLat([destination.lng, destination.lat])
          .addTo(m)
      );
    }
    for (const st of pinned) {
      markers.current.push(new Marker({ element: stopEl(st) }).setLngLat([st.lng as number, st.lat as number]).addTo(m));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markersKey covers stops / destination
  }, [markersKey]);

  // The route: ask OSRM for the road route through every point; a straight dashed line if it fails.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const show = (l: Leg | null, dashed: boolean) => {
      drawn.current = { leg: l, dashed };
      if (styleReady.current) drawRoute(m, l, dashed);
    };
    if (points.length < 2) {
      queueMicrotask(() => {
        setLeg(null);
        setRouteFailed(false);
      });
      show(null, false);
      return;
    }
    const ctl = new AbortController();
    fetchRoute(points, ctl.signal)
      .then((l) => {
        setLeg(l);
        setRouteFailed(false);
        show(l, false);
      })
      .catch((e: unknown) => {
        if (ctl.signal.aborted) return;
        console.warn('Road route unavailable, drawing straight lines:', e);
        setLeg(null);
        setRouteFailed(true);
        show({ coords: points, km: null, minutes: null }, true);
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pointsKey covers points
  }, [pointsKey]);

  // Keep every stop and the gala in view when the set of points changes.
  useEffect(() => {
    const m = map.current;
    if (!m || !points.length) return;
    const fit = () => {
      if (points.length === 1) m.jumpTo({ center: points[0], zoom: 14 });
      else {
        const b = points.reduce((acc, p) => acc.extend(p), new LngLatBounds(points[0], points[0]));
        // Extra room on top: a pin stands above its spot.
        m.fitBounds(b, { padding: { top: 60, bottom: 30, left: 40, right: 40 }, maxZoom: 15, animate: !calm });
      }
    };
    if (m.loaded()) fit();
    else m.once('load', fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pointsKey covers points
  }, [pointsKey]);

  const unpinned = stops.length - pinned.length;
  const count = `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'}`;
  return (
    <>
      <div ref={box} className={s.map} role="img" aria-label={`Map of the gala route: ${count}`} />
      <div className={s.note}>
        <Icon name="pin" size={16} />
        <span>
          {count}
          {area ? ` · ${area}` : ''}
          {leg?.minutes != null && leg.km != null && (
            <b className={s.drive}>
              {' '}
              · about {fmtTime(leg.minutes)} drive ({leg.km < 10 ? leg.km.toFixed(1) : Math.round(leg.km)} km)
            </b>
          )}
        </span>
      </div>
      {routeFailed && <p className={`fine ${s.sub}`}>Can’t get the road route right now, so the stops are joined by straight lines.</p>}
      {unpinned > 0 && (
        <p className={`fine ${s.sub}`}>
          {unpinned === 1 ? '1 stop has' : `${unpinned} stops have`} no map pin yet. Edit the stop and pin it to add it to
          the route.
        </p>
      )}
      {!destination && pinned.length > 0 && (
        <p className={`fine ${s.sub}`}>The gala has no map pin yet. The Gala Leader can pin it in Settings.</p>
      )}
    </>
  );
}
