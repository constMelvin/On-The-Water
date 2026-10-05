'use client';

/**
 * The real map behind "Who's OTW?": OpenStreetMap tiles via react-leaflet, one avatar pin per
 * member who is sharing, the gala's destination pin and the meeting point flag. Loaded with next/dynamic (ssr: false):
 * Leaflet needs `window`.
 */
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import s from './map.module.css';

export interface MapPin {
  userId: string;
  name: string;
  tone: string;
  lat: number;
  lng: number;
  me: boolean;
}

export interface LiveMapProps {
  pins: MapPin[];
  meeting: { lat: number; lng: number; label: string | null } | null;
  /** Where the gala is (its destination), when the Gala Leader pinned it. */
  destination: { lat: number; lng: number; label: string } | null;
  selected: string | null;
  onSelect: (userId: string) => void;
}

/** Metro Manila, when nobody is sharing and there's no meeting point. */
const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function pinIcon(p: MapPin, selected: boolean): L.DivIcon {
  const initial = esc((p.name.trim()[0] ?? '?').toUpperCase());
  return L.divIcon({
    className: s.pinWrap,
    html: `<span class="av c-${esc(p.tone)} ${s.pin}${selected ? ` ${s.sel}` : ''}">${initial}${
      p.me ? `<i class="${s.you}">You</i>` : ''
    }</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const flagIcon = L.divIcon({
  className: s.pinWrap,
  html: `<span class="${s.flag}"><svg viewBox="-20 -20 40 40" width="40" height="40" aria-hidden="true"><circle r="17"/><path d="M-5 9V-9M-5-8h11l-2.4 4.5L6 1H-5"/></svg></span>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

/** The gala's destination: a map-pin shape, anchored at its tip. */
const destinationIcon = L.divIcon({
  className: s.pinWrap,
  html: `<span class="${s.dest}"><svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path d="M12 22.5s-8-7.6-8-13a8 8 0 0 1 16 0c0 5.4-8 13-8 13z"/><circle cx="12" cy="9.5" r="3"/></svg></span>`,
  iconSize: [44, 44],
  iconAnchor: [22, 42],
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

export default function LiveMap({ pins, meeting, destination, selected, onSelect }: LiveMapProps) {
  const points = useMemo<[number, number][]>(
    () => [
      ...pins.map((p) => [p.lat, p.lng] as [number, number]),
      ...(meeting ? [[meeting.lat, meeting.lng] as [number, number]] : []),
      ...(destination ? [[destination.lat, destination.lng] as [number, number]] : []),
    ],
    [pins, meeting, destination]
  );
  return (
    <MapContainer className={s.leaflet} center={points[0] ?? DEFAULT_CENTER} zoom={13} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitOnce points={points} />
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
          eventHandlers={{ click: () => onSelect(p.userId) }}
        />
      ))}
    </MapContainer>
  );
}
