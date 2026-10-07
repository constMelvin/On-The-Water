'use client';

/**
 * Click-to-pin map for "Pick on map" (OpenStreetMap via react-leaflet). Loaded with
 * next/dynamic (ssr: false): Leaflet needs `window`.
 */
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';

/** Metro Manila when nothing is picked yet. */
const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];

export interface MapPickerProps {
  pin: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
  /** Classes for the map box (default: the 320px-tall Plan a Gala dialog map). */
  className?: string;
  /** Wheel zoom; turn off when the map sits inside something that scrolls. Default on. */
  scrollWheelZoom?: boolean;
  /** No pan / zoom animation (prefers-reduced-motion). Default off. */
  calm?: boolean;
}

function ClickToPick({ onPick }: { onPick: MapPickerProps['onPick'] }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** The map mounts inside an animating dialog: re-measure once it has its real size. */
function FixSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/** Keeps a searched place in view. */
function Follow({ pin, calm }: { pin: MapPickerProps['pin']; calm: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (pin) map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 13), { animate: !calm });
  }, [map, pin, calm]);
  return null;
}

export default function MapPicker({
  pin,
  onPick,
  className = 'h-[320px] w-full rounded-lg',
  scrollWheelZoom = true,
  calm = false,
}: MapPickerProps) {
  return (
    <MapContainer
      center={pin ? [pin.lat, pin.lng] : DEFAULT_CENTER}
      zoom={pin ? 13 : 6}
      scrollWheelZoom={scrollWheelZoom}
      zoomAnimation={!calm}
      fadeAnimation={!calm}
      markerZoomAnimation={!calm}
      className={className}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPick onPick={onPick} />
      <FixSize />
      <Follow pin={pin} calm={calm} />
      {pin && (
        <CircleMarker
          center={[pin.lat, pin.lng]}
          radius={12}
          pathOptions={{ color: '#ffffff', weight: 4, fillColor: '#e0417c' /* --rosy; Leaflet can't read CSS vars */, fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  );
}

