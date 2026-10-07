'use client';

/**
 * The real map behind "Who's OTW?": OpenStreetMap tiles via react-leaflet, one branded teardrop pin per
 * member who is sharing (member colour, initial, status ring + icon, a soft pulse on movers), the gala's
 * destination flag pin and the meeting point flag. Loaded with next/dynamic (ssr: false): Leaflet needs
 * `window`.
 */
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { IC } from '@/lib/otw/icons';
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

/** Metro Manila, when nobody is sharing and there's no meeting point. */
const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const RING: Record<TravelMeta['cls'], string> = { home: s.stHome, otw: s.stOtw, almost: s.stAlmost, there: s.stThere };

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const prefersCalm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Icons are cached so a re-render doesn't rebuild them (which would restart the pulse). */
const iconCache = new Map<string, L.DivIcon>();

/** A teardrop in the member's colour with their initial, ringed by status, anchored at its tip. */
function pinIcon(p: MapPin, selected: boolean): L.DivIcon {
  const initial = esc((p.name.trim()[0] ?? '?').toUpperCase());
  const meta = TRAVEL[p.status];
  const key = `${initial}|${p.tone}|${p.status}|${p.moving}|${p.me}|${selected}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: s.pinWrap,
      html:
        `<span class="${s.mk} ${RING[meta.cls]}${p.moving ? ` ${s.moving}` : ''}${selected ? ` ${s.sel}` : ''}">` +
        `<i class="${s.pulse}"></i>` +
        `<span class="${s.ring}"></span>` +
        `<span class="${s.drop} c-${esc(p.tone)}"><b>${initial}</b></span>` +
        `<span class="${s.sbadge}"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[meta.icon]}</svg></span>` +
        (p.me ? `<i class="${s.you}">You</i>` : '') +
        `</span>`,
      iconSize: [46, 54],
      iconAnchor: [23, 50],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

const flagIcon = L.divIcon({
  className: s.pinWrap,
  html: `<span class="${s.flag}"><svg viewBox="-20 -20 40 40" width="40" height="40" aria-hidden="true"><circle r="17"/><path d="M-5 9V-9M-5-8h11l-2.4 4.5L6 1H-5"/></svg></span>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

/** The gala's destination: a zest map pin with a flag in it and a "Gala" tag, anchored at its tip. */
const destinationIcon = L.divIcon({
  className: s.pinWrap,
  html:
    `<span class="${s.dest}"><svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">` +
    `<path class="${s.destPin}" d="M12 22.5s-8-7.6-8-13a8 8 0 0 1 16 0c0 5.4-8 13-8 13z"/>` +
    `<path class="${s.destFlag}" d="M6 21V4M6 5h11l-2 4 2 4H6" transform="translate(6.6 3.6) scale(0.5)"/>` +
    `</svg><i class="${s.gtag}">Gala</i></span>`,
  iconSize: [48, 60],
  iconAnchor: [24, 45],
});

/** Fits the view to everyone the first time there is someone (or something) to show. */
function FitOnce({ points }: { points: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !points.length) return;
    done.current = true;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

/** Pans to a member when they are picked (pin, or "Locate" on their row). Instant under reduced motion. */
function PanToSelected({ pins, selected, calm }: { pins: MapPin[]; selected: string | null; calm: boolean }) {
  const map = useMap();
  const latest = useRef(pins);
  useEffect(() => {
    latest.current = pins;
  });
  useEffect(() => {
    const p = selected ? latest.current.find((x) => x.userId === selected) : null;
    if (p) map.setView([p.lat, p.lng], Math.max(map.getZoom(), 15), { animate: !calm });
  }, [map, selected, calm]);
  return null;
}

/** Glides to `focus` each time it changes (jumps instead when the user prefers reduced motion). */
function FlyTo({ focus, calm }: { focus: MapFocus | null; calm: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    if (calm) map.setView([focus.lat, focus.lng], focus.zoom, { animate: false });
    else map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.8 });
  }, [map, focus, calm]);
  return null;
}

export default function LiveMap({ pins, meeting, destination, selected, onSelect, focus }: LiveMapProps) {
  const calm = useSyncExternalStore(subscribeMotion, prefersCalm, () => false);
  const points = useMemo<[number, number][]>(
    () => [
      ...pins.map((p) => [p.lat, p.lng] as [number, number]),
      ...(meeting ? [[meeting.lat, meeting.lng] as [number, number]] : []),
      ...(destination ? [[destination.lat, destination.lng] as [number, number]] : []),
    ],
    [pins, meeting, destination]
  );
  return (
    <MapContainer
      className={s.leaflet}
      center={points[0] ?? DEFAULT_CENTER}
      zoom={13}
      scrollWheelZoom
      zoomAnimation={!calm}
      fadeAnimation={!calm}
      markerZoomAnimation={!calm}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitOnce points={points} />
      <PanToSelected pins={pins} selected={selected} calm={calm} />
      <FlyTo focus={focus} calm={calm} />
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} title={destination.label} zIndexOffset={-100} />
      )}
      {meeting && <Marker position={[meeting.lat, meeting.lng]} icon={flagIcon} title={meeting.label ?? 'Meeting point'} />}
      {pins.map((p) => (
        <Marker
          key={p.userId}
          position={[p.lat, p.lng]}
          icon={pinIcon(p, selected === p.userId)}
          title={p.name}
          keyboard
          zIndexOffset={selected === p.userId ? 1000 : p.moving ? 100 : 0}
          eventHandlers={{ click: () => onSelect(p.userId) }}
        />
      ))}
    </MapContainer>
  );
}
