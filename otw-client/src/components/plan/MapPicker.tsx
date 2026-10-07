'use client';

/**
 * Click-to-pin map for "Pick on map" (MapLibre GL + OpenFreeMap vector tiles). Loaded with
 * next/dynamic (ssr: false): MapLibre needs `window` and WebGL.
 */
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { LngLatBounds, Map as MlMap, Marker, NavigationControl } from 'maplibre-gl';
import { MANILA, foldAttribution, setupMapLibre, useMapStyle } from '@/lib/otw/maplibre';
import s from './map-picker.module.css';

/** Something already on the map, shown for reference (Add a Stop: the other stops and the gala). */
export interface Landmark {
  lat: number;
  lng: number;
  label: string;
  /** A numbered stop, or the gala's destination. */
  kind: 'stop' | 'gala';
  /** The stop's number in the plan. */
  n?: number;
}

export interface MapPickerProps {
  pin: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
  /** Classes for the map box (default: the 320px-tall Plan a Gala dialog map). */
  className?: string;
  /** Wheel zoom; turn off when the map sits inside something that scrolls. Default on. */
  scrollWheelZoom?: boolean;
  /** No pan / zoom animation (prefers-reduced-motion). Default off. */
  calm?: boolean;
  /** Places already pinned, drawn small and not clickable; the first view fits them when nothing is picked yet. */
  landmarks?: Landmark[];
}

function landmarkEl(l: Landmark): HTMLElement {
  const el = document.createElement('div');
  el.className = l.kind === 'gala' ? s.lmGala : s.lmStop;
  el.title = l.label;
  el.textContent = l.kind === 'gala' ? 'Gala' : String(l.n ?? '');
  return el;
}

export default function MapPicker({
  pin,
  onPick,
  className = 'h-[320px] w-full rounded-lg',
  scrollWheelZoom = true,
  calm = false,
  landmarks = [],
}: MapPickerProps) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const style = useMapStyle();
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });

  // Create the map once; the latest pin / style / options are applied by the effects below.
  useEffect(() => {
    if (!box.current) return;
    setupMapLibre();
    const m = new MlMap({
      container: box.current,
      style,
      center: pin ? [pin.lng, pin.lat] : MANILA,
      zoom: pin ? 13 : 5,
      attributionControl: { compact: true },
      fadeDuration: calm ? 0 : 300,
    });
    m.addControl(new NavigationControl({ showCompass: false }), 'top-left');
    foldAttribution(m);
    m.on('click', (e) => pick.current(e.lngLat.lat, e.lngLat.lng));
    // Nothing picked yet: start on the stops / gala that are already pinned.
    if (!pin && landmarks.length) {
      m.once('load', () => {
        if (map.current !== m || marker.current) return;
        if (landmarks.length === 1) m.jumpTo({ center: [landmarks[0].lng, landmarks[0].lat], zoom: 13 });
        else {
          const first: [number, number] = [landmarks[0].lng, landmarks[0].lat];
          const b = landmarks.reduce((acc, l) => acc.extend([l.lng, l.lat]), new LngLatBounds(first, first));
          m.fitBounds(b, { padding: 40, maxZoom: 14, animate: false });
        }
      });
    }
    map.current = m;
    // The map mounts inside an animating dialog: re-measure whenever the box changes size.
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    return () => {
      ro.disconnect();
      marker.current = null;
      map.current = null;
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; updates below
  }, []);

  // Theme switched: swap the map style (markers are HTML, so they stay put).
  const shownStyle = useRef(style);
  useEffect(() => {
    if (!map.current || shownStyle.current === style) return;
    shownStyle.current = style;
    map.current.setStyle(style);
  }, [style]);

  // Reference markers for what's already pinned (clicks go through to the map, so you can pin next to them).
  const landmarksKey = landmarks.map((l) => `${l.kind}:${l.n ?? ''}:${l.lat},${l.lng}:${l.label}`).join('|');
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const list = landmarks.map((l) =>
      new Marker({ element: landmarkEl(l), anchor: l.kind === 'gala' ? 'bottom' : 'center' }).setLngLat([l.lng, l.lat]).addTo(m)
    );
    return () => list.forEach((mk) => mk.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- landmarksKey covers landmarks
  }, [landmarksKey]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (scrollWheelZoom) m.scrollZoom.enable();
    else m.scrollZoom.disable();
  }, [scrollWheelZoom]);

  // The pin, and keeping a searched / picked place in view.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!pin) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const el = document.createElement('span');
      el.className = s.dot;
      marker.current = new Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(m);
    } else {
      marker.current.setLngLat([pin.lng, pin.lat]);
    }
    const zoom = Math.max(m.getZoom(), 13);
    if (calm) m.jumpTo({ center: [pin.lng, pin.lat], zoom });
    else m.easeTo({ center: [pin.lng, pin.lat], zoom, duration: 500 });
  }, [pin, calm]);

  return <div ref={box} className={`${s.map} ${className}`} />;
}
