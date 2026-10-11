'use client';

/**
 * The Halfway Checker's map (MapLibre GL + OpenFreeMap): both homes, the midpoint and the date spots.
 * Loaded with next/dynamic (ssr: false) because MapLibre needs `window` and WebGL.
 */
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { LngLatBounds, Map as MlMap, Marker, NavigationControl } from 'maplibre-gl';
import { MANILA, foldAttribution, setupMapLibre, useMapStyle } from '@/lib/otw/maplibre';
import s from './halfway.module.css';

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface HalfwayMapProps {
  mine: (MapPoint & { label: string }) | null;
  partner: (MapPoint & { label: string }) | null;
  midpoint: MapPoint | null;
  spots: (MapPoint & { name: string })[];
  /** Index into `spots` of the chosen one, or -1. */
  selected: number;
  onSelect: (index: number) => void;
  /** No pan / zoom animation (prefers-reduced-motion). */
  calm?: boolean;
}

function dot(cls: string, text: string, title: string): HTMLElement {
  const el = document.createElement('span');
  el.className = cls;
  el.textContent = text;
  el.title = title;
  return el;
}

export default function HalfwayMap({ mine, partner, midpoint, spots, selected, onSelect, calm = false }: HalfwayMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const style = useMapStyle();
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  });

  useEffect(() => {
    if (!box.current) return;
    setupMapLibre();
    const m = new MlMap({
      container: box.current,
      style,
      center: MANILA,
      zoom: 9,
      attributionControl: { compact: true },
      fadeDuration: calm ? 0 : 300,
    });
    m.addControl(new NavigationControl({ showCompass: false }), 'top-left');
    foldAttribution(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    return () => {
      ro.disconnect();
      map.current = null;
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; updates below
  }, []);

  const shownStyle = useRef(style);
  useEffect(() => {
    if (!map.current || shownStyle.current === style) return;
    shownStyle.current = style;
    map.current.setStyle(style);
  }, [style]);

  // Markers and the view, redrawn when what's on the map changes.
  const key = JSON.stringify([mine, partner, midpoint, spots.map((p) => [p.lat, p.lng]), selected]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const markers: Marker[] = [];
    const add = (el: HTMLElement, p: MapPoint, anchor: 'center' | 'bottom' = 'center') =>
      markers.push(new Marker({ element: el, anchor }).setLngLat([p.lng, p.lat]).addTo(m));

    spots.forEach((p, i) => {
      const el = dot(i === selected ? s.spotOn : s.spot, '', p.name);
      el.setAttribute('role', 'button');
      el.addEventListener('click', () => select.current(i));
      add(el, p);
    });
    if (mine) add(dot(s.me, 'You', mine.label || 'Your home'), mine);
    if (partner) add(dot(s.partner, 'Them', partner.label || "Their home"), partner);
    if (midpoint) add(dot(s.mid, 'Halfway', 'Halfway point'), midpoint);

    const points: MapPoint[] = [mine, partner, midpoint, selected >= 0 ? spots[selected] : null].filter(
      (p): p is MapPoint => !!p
    );
    if (points.length === 1) {
      m.jumpTo({ center: [points[0].lng, points[0].lat], zoom: 13 });
    } else if (points.length > 1) {
      const first: [number, number] = [points[0].lng, points[0].lat];
      const b = points.reduce((acc, p) => acc.extend([p.lng, p.lat]), new LngLatBounds(first, first));
      m.fitBounds(b, { padding: 60, maxZoom: 14, animate: !calm });
    }
    return () => markers.forEach((mk) => mk.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers every input
  }, [key, calm]);

  return <div ref={box} className={s.map} role="img" aria-label="Map of your two homes and the halfway point" />;
}
