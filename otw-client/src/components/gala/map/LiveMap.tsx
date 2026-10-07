'use client';

/**
 * The real map behind "Who's OTW?": MapLibre GL with OpenFreeMap vector tiles (light / dark style
 * follows the app theme), one branded teardrop pin per member who is sharing (member colour,
 * initial, status ring + icon, a soft pulse on movers), the gala's destination pin and the meeting
 * point flag. Loaded with next/dynamic (ssr: false): MapLibre needs `window` and WebGL.
 */
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { LngLatBounds, Map as MlMap, Marker, NavigationControl } from 'maplibre-gl';
import { IC } from '@/lib/otw/icons';
import { MANILA, foldAttribution, setupMapLibre, useCalm, useMapStyle } from '@/lib/otw/maplibre';
import type { TravelStatus } from '@/lib/api/rooms';
import { TRAVEL, type TravelMeta } from './travel';
import s from './map.module.css';

export interface MapPin {
  userId: string;
  name: string;
  tone: string;
  lat: number;
  lng: number;
  me: boolean;
  status: TravelStatus;
  /** Sharing live while on the way / almost there: the pin pulses. */
  moving: boolean;
}

export interface LiveMapProps {
  pins: MapPin[];
  meeting: { lat: number; lng: number; label: string | null } | null;
  /** Where the gala is (its destination), when the Gala Leader pinned it. */
  destination: { lat: number; lng: number; label: string } | null;
  selected: string | null;
  onSelect: (userId: string) => void;
  /** Where to move the view (gala / meeting point); bump `n` to move there again. */
  focus: MapFocus | null;
}

export interface MapFocus {
  lat: number;
  lng: number;
  zoom: number;
  n: number;
}

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const RING: Record<TravelMeta['cls'], string> = { home: s.stHome, otw: s.stOtw, almost: s.stAlmost, there: s.stThere };

/** The inside of a member pin: a teardrop in their colour with their initial, ringed by status. */
function pinHtml(p: MapPin, selected: boolean): string {
  const initial = esc((p.name.trim()[0] ?? '?').toUpperCase());
  const meta = TRAVEL[p.status];
  return (
    `<span class="${s.mk} ${RING[meta.cls]}${p.moving ? ` ${s.moving}` : ''}${selected ? ` ${s.sel}` : ''}">` +
    `<i class="${s.pulse}"></i>` +
    `<span class="${s.ring}"></span>` +
    `<span class="${s.drop} c-${esc(p.tone)}"><b>${initial}</b></span>` +
    `<span class="${s.sbadge}"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[meta.icon]}</svg></span>` +
    (p.me ? `<i class="${s.you}">You</i>` : '') +
    `</span>`
  );
}

const FLAG_HTML = `<span class="${s.flag}"><svg viewBox="-20 -20 40 40" width="40" height="40" aria-hidden="true"><circle r="17"/><path d="M-5 9V-9M-5-8h11l-2.4 4.5L6 1H-5"/></svg></span>`;

/** The gala's destination: a zest map pin with a flag in it and a "Gala" tag. */
const DEST_HTML =
  `<span class="${s.dest}"><svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">` +
  `<path class="${s.destPin}" d="M12 22.5s-8-7.6-8-13a8 8 0 0 1 16 0c0 5.4-8 13-8 13z"/>` +
  `<path class="${s.destFlag}" d="M6 21V4M6 5h11l-2 4 2 4H6" transform="translate(6.6 3.6) scale(0.5)"/>` +
  `</svg><i class="${s.gtag}">Gala</i></span>`;

/** A marker element of a fixed size; `offset` puts its anchor point (the pin's tip) on the spot. */
function markerEl(html: string, w: number, h: number, title: string): HTMLElement {
  const el = document.createElement('div');
  el.className = s.pinWrap;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.title = title;
  el.innerHTML = html;
  return el;
}

interface Member {
  marker: Marker;
  el: HTMLElement;
  /** What the pin looks like now; the HTML is only rebuilt when this changes (keeps the pulse going). */
  look: string;
}

export default function LiveMap({ pins, meeting, destination, selected, onSelect, focus }: LiveMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const members = useRef(new Map<string, Member>());
  const extras = useRef<{ dest?: Marker; meet?: Marker }>({});
  /** How many points the view was last fitted to, and whether the person has moved the map since. */
  const fitted = useRef(0);
  const touched = useRef(false);
  const style = useMapStyle();
  const calm = useCalm();
  const select = useRef(onSelect);
  const latestPins = useRef(pins);
  useEffect(() => {
    select.current = onSelect;
    latestPins.current = pins;
  });

  // Create the map once; markers, style and camera moves are applied by the effects below.
  useEffect(() => {
    if (!box.current) return;
    setupMapLibre();
    const first = pins[0] ?? meeting ?? destination;
    const m = new MlMap({
      container: box.current,
      style,
      center: first ? [first.lng, first.lat] : MANILA,
      zoom: 13,
      attributionControl: { compact: true },
    });
    m.addControl(new NavigationControl({ showCompass: false }), 'top-left');
    foldAttribution(m);
    // Only a real drag / scroll / pinch counts (camera moves made in code have no originalEvent).
    const mark = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) touched.current = true;
    };
    m.on('dragstart', mark);
    m.on('zoomstart', mark);
    map.current = m;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(box.current);
    const all = members.current;
    return () => {
      ro.disconnect();
      all.clear();
      extras.current = {};
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

  // Member pins: add new ones, move / restyle the rest, drop people who stopped sharing.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const p of pins) {
      seen.add(p.userId);
      const isSel = selected === p.userId;
      const look = pinHtml(p, isSel);
      let mm = members.current.get(p.userId);
      if (!mm) {
        const el = markerEl(look, 46, 54, p.name);
        // Keyboard: each pin is a button (Enter / Space selects).
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', p.name);
        const id = p.userId;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          select.current(id);
        });
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            select.current(id);
          }
        });
        const marker = new Marker({ element: el, anchor: 'top-left', offset: [-23, -50] }).setLngLat([p.lng, p.lat]).addTo(m);
        mm = { marker, el, look };
        members.current.set(p.userId, mm);
      } else {
        mm.marker.setLngLat([p.lng, p.lat]);
        if (mm.look !== look) {
          mm.el.innerHTML = look;
          mm.look = look;
        }
        mm.el.title = p.name;
        mm.el.setAttribute('aria-label', p.name);
      }
      // Selected on top, then people on the move, then everyone else; the gala pin stays underneath.
      mm.el.style.zIndex = String(isSel ? 30 : p.moving ? 20 : 10);
    }
    for (const [id, mm] of members.current) {
      if (!seen.has(id)) {
        mm.marker.remove();
        members.current.delete(id);
      }
    }
  }, [pins, selected]);

  // The gala's destination and the meeting point.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const ex = extras.current;
    ex.dest?.remove();
    ex.dest = undefined;
    if (destination) {
      const el = markerEl(DEST_HTML, 48, 60, destination.label);
      el.style.zIndex = '1';
      ex.dest = new Marker({ element: el, anchor: 'top-left', offset: [-24, -45] })
        .setLngLat([destination.lng, destination.lat])
        .addTo(m);
    }
  }, [destination]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const ex = extras.current;
    ex.meet?.remove();
    ex.meet = undefined;
    if (meeting) {
      const el = markerEl(FLAG_HTML, 40, 40, meeting.label ?? 'Meeting point');
      el.style.zIndex = '5';
      ex.meet = new Marker({ element: el, anchor: 'center' }).setLngLat([meeting.lng, meeting.lat]).addTo(m);
    }
  }, [meeting]);

  // Fit everyone in view; refit as more people / places load, until the person moves the map.
  useEffect(() => {
    const m = map.current;
    if (!m || touched.current) return;
    const pts: [number, number][] = [
      ...pins.map((p) => [p.lng, p.lat] as [number, number]),
      ...(meeting ? [[meeting.lng, meeting.lat] as [number, number]] : []),
      ...(destination ? [[destination.lng, destination.lat] as [number, number]] : []),
    ];
    if (pts.length <= fitted.current) return;
    const fit = () => {
      if (touched.current || map.current !== m || pts.length <= fitted.current) return;
      fitted.current = pts.length;
      if (pts.length === 1) m.jumpTo({ center: pts[0], zoom: 15 });
      else {
        const b = pts.reduce((acc, p) => acc.extend(p), new LngLatBounds(pts[0], pts[0]));
        // Extra room on top: a pin stands about 50px above its spot.
        m.fitBounds(b, { padding: { top: 70, bottom: 30, left: 40, right: 40 }, maxZoom: 16, animate: false });
      }
    };
    // Before the first load the map may not know its size yet, and fitBounds would do nothing.
    if (m.loaded()) fit();
    else m.once('load', fit);
  }, [pins, meeting, destination]);

  // Pan to a member when they are picked (pin, or "Locate" on their row).
  useEffect(() => {
    const m = map.current;
    const p = selected ? latestPins.current.find((x) => x.userId === selected) : null;
    if (!m || !p) return;
    touched.current = true;
    const zoom = Math.max(m.getZoom(), 15);
    if (calm) m.jumpTo({ center: [p.lng, p.lat], zoom });
    else m.easeTo({ center: [p.lng, p.lat], zoom, duration: 600 });
  }, [selected, calm]);

  // Glide to `focus` (Find the gala / Meeting point) each time it changes.
  useEffect(() => {
    const m = map.current;
    if (!m || !focus) return;
    touched.current = true;
    if (calm) m.jumpTo({ center: [focus.lng, focus.lat], zoom: focus.zoom });
    else m.flyTo({ center: [focus.lng, focus.lat], zoom: focus.zoom, duration: 800 });
  }, [focus, calm]);

  return <div ref={box} className={s.map} />;
}
