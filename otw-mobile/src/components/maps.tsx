/**
 * Maps for the gala screens: MapLibre + OpenFreeMap, same as the web (no API key). Numbered stop pins,
 * the gala's flag, a driving route from the public OSRM server (dashed straight line when it can't be
 * reached), and a tap-to-pin picker. Coordinates here are { lat, lng }; MapLibre itself wants [lng, lat].
 */
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MlMap,
  Marker,
  type CameraRef,
  type InitialViewState,
  type LngLat,
} from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { useScrollLock } from './LockableScrollView';
import { useMapStyle } from '@/lib/otw/map-style';
import { font } from '@/theme/fonts';
import { brand } from '@/theme/tokens';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Metro Manila, when there is nothing to centre on. */
export const MANILA: LatLng = { lat: 14.5995, lng: 120.9842 };

const toLngLat = (p: LatLng): LngLat => [p.lng, p.lat];

const FIT_PADDING = { top: 56, right: 48, bottom: 40, left: 48 };

/** Camera view that shows every point (or Manila when there are none). */
export function viewFor(points: LatLng[]): InitialViewState {
  if (!points.length) return { center: toLngLat(MANILA), zoom: 10 };
  if (points.length === 1) return { center: toLngLat(points[0]), zoom: 13 };
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return { bounds: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)], padding: FIT_PADDING };
}

/** Moves the camera to show every point (animated). */
export function fitTo(camera: CameraRef | null, points: LatLng[], duration = 400) {
  if (!camera || !points.length) return;
  const v = viewFor(points);
  if ('bounds' in v && v.bounds) camera.fitBounds(v.bounds, { padding: FIT_PADDING, duration });
  else if ('center' in v && v.center) camera.easeTo({ center: v.center, zoom: v.zoom, duration });
}

/** Moves the camera to one point at a street-level zoom. */
export function flyTo(camera: CameraRef | null, p: LatLng, zoom = 15) {
  camera?.easeTo({ center: toLngLat(p), zoom, duration: 400 });
}

/** MapLibre map with the OTW style (light / night by theme) and a camera. */
export function OtwMap({
  initial,
  cameraRef,
  onPress,
  style,
  children,
}: {
  initial: InitialViewState;
  cameraRef?: Ref<CameraRef>;
  onPress?: (p: LatLng) => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const mapStyle = useMapStyle();
  const scrollLock = useScrollLock();
  return (
    <View style={[styles.frame, style]} {...scrollLock}>
      <MlMap
        style={styles.fill}
        mapStyle={mapStyle}
        logo={false}
        compass={false}
        touchPitch={false}
        attributionPosition={{ bottom: 6, right: 6 }}
        onPress={onPress ? (e) => onPress({ lng: e.nativeEvent.lngLat[0], lat: e.nativeEvent.lngLat[1] }) : undefined}>
        <Camera ref={cameraRef} initialViewState={initial} />
        {children}
      </MlMap>
    </View>
  );
}

/** A React view pinned to a point. `anchor` 'bottom' for pins with a tail, 'center' for round badges. */
export function MapMarker({
  at,
  anchor = 'bottom',
  label,
  onPress,
  children,
}: {
  at: LatLng;
  anchor?: 'bottom' | 'center';
  label?: string;
  onPress?: () => void;
  children: ReactElement;
}) {
  return (
    <Marker lngLat={toLngLat(at)} anchor={anchor}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
          {children}
        </Pressable>
      ) : (
        <View accessible={!!label} accessibilityLabel={label}>
          {children}
        </View>
      )}
    </Marker>
  );
}

/** A line through the points. `dashed` for "as the crow flies". */
export function MapLine({ id, points, color = brand.rosy, width = 5, dashed }: { id: string; points: LatLng[]; color?: string; width?: number; dashed?: boolean }) {
  const data = useMemo<GeoJSON.Feature>(
    () => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map(toLngLat) } }),
    [points],
  );
  if (points.length < 2) return null;
  return (
    <GeoJSONSource id={id} data={data}>
      <Layer
        id={`${id}-line`}
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': color, 'line-width': width, ...(dashed ? { 'line-dasharray': [2, 1.6] } : {}) }}
      />
    </GeoJSONSource>
  );
}

/** Round brand pin with a number or an icon, and a pointed tail. */
export function Pin({ fill, ink, n, icon, size = 34 }: { fill: string; ink: string; n?: number; icon?: IconName; size?: number }) {
  return (
    <View style={styles.pinWrap}>
      <View style={[styles.pin, { width: size, height: size, borderRadius: size / 2, backgroundColor: fill }]}>
        {icon ? <Icon name={icon} size={size * 0.55} color={ink} /> : <Text style={[styles.pinNum, { color: ink }]}>{n}</Text>}
      </View>
      <View style={[styles.tail, { borderTopColor: fill }]} />
    </View>
  );
}

const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
const routeCache = new Map<string, LatLng[]>();

/** Driving route through the points (cached per point list). Null while loading, 'failed' when OSRM is down. */
function useDrivingRoute(points: LatLng[]): LatLng[] | null | 'failed' {
  const key = points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
  const [route, setRoute] = useState<{ key: string; line: LatLng[] | 'failed' } | null>(null);
  const cached = routeCache.get(key);
  useEffect(() => {
    if (points.length < 2 || routeCache.has(key)) return;
    let alive = true;
    fetch(`${OSRM}${key}?overview=full&geometries=geojson`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('osrm'))))
      .then((j: { routes?: { geometry: { coordinates: [number, number][] } }[] }) => {
        const coords = j.routes?.[0]?.geometry.coordinates;
        if (!coords) throw new Error('no route');
        const line = coords.map(([lng, lat]) => ({ lat, lng }));
        routeCache.set(key, line);
        if (alive) setRoute({ key, line });
      })
      .catch(() => alive && setRoute({ key, line: 'failed' }));
    return () => {
      alive = false;
    };
    // key captures the points.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (points.length < 2) return null;
  if (cached) return cached;
  return route?.key === key ? route.line : null;
}

const pointsOf = (pinKey: string): LatLng[] =>
  (JSON.parse(pinKey) as ([number, number] | null)[]).filter((p): p is [number, number] => !!p).map(([lat, lng]) => ({ lat, lng }));

export interface Landmark {
  lat: number;
  lng: number;
  label: string;
  kind: 'stop' | 'gala';
  /** Stop number (kind 'stop'). */
  n?: number;
}

export interface MapStop {
  id: string;
  n: number;
  title: string;
  lat: number | null;
  lng: number | null;
  fill: string;
  ink: string;
  icon: IconName;
}

/** "The plan" map: numbered pins in plan order + the gala flag, joined by the driving route. */
export function RouteMap({
  stops,
  destination,
  style,
}: {
  stops: MapStop[];
  destination: { lat: number; lng: number; label: string } | null;
  style?: StyleProp<ViewStyle>;
}) {
  const pinned = stops.filter((s) => s.lat != null && s.lng != null);
  // Recompute only when a pin actually moves (the stop objects are new on every render).
  const pinKey = JSON.stringify([...pinned.map((s) => [s.lat, s.lng]), destination ? [destination.lat, destination.lng] : null]);
  const points = pointsOf(pinKey);
  const route = useDrivingRoute(points);
  const camera = useRef<CameraRef>(null);
  const [initial] = useState(() => viewFor(points));
  useEffect(() => fitTo(camera.current, pointsOf(pinKey)), [pinKey]);

  return (
    <OtwMap initial={initial} cameraRef={camera} style={[styles.map, style]}>
      {route && route !== 'failed' ? <MapLine id="route" points={route} /> : null}
      {route === 'failed' ? <MapLine id="route-straight" points={points} width={4} dashed /> : null}
      {pinned.map((s) => (
        <MapMarker key={s.id} at={{ lat: s.lat!, lng: s.lng! }} label={`${s.n}. ${s.title}`}>
          <Pin fill={s.fill} ink={s.ink} n={s.n} />
        </MapMarker>
      ))}
      {destination ? (
        <MapMarker at={destination} label={destination.label}>
          <Pin fill={brand.rosy} ink={brand.cream} icon="flag" size={38} />
        </MapMarker>
      ) : null}
    </OtwMap>
  );
}

/** Tap to drop / move a pin; existing stops and the gala show as small landmarks. */
export function MapPicker({
  pin,
  onPick,
  landmarks = [],
  style,
}: {
  pin: LatLng | null;
  onPick: (lat: number, lng: number) => void;
  landmarks?: Landmark[];
  style?: StyleProp<ViewStyle>;
}) {
  const camera = useRef<CameraRef>(null);
  // Only the first render picks the starting view.
  const [initial] = useState<InitialViewState>(() => (pin ? { center: toLngLat(pin), zoom: 14 } : viewFor(landmarks)));
  useEffect(() => {
    if (pin) flyTo(camera.current, pin, 14.5);
  }, [pin?.lat, pin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <OtwMap initial={initial} cameraRef={camera} onPress={(p) => onPick(p.lat, p.lng)} style={[styles.picker, style]}>
      {landmarks.map((l, i) => (
        <MapMarker key={`${l.kind}${i}`} at={l} label={l.label}>
          {l.kind === 'gala' ? <Pin fill={brand.rosy} ink={brand.cream} icon="flag" size={28} /> : <Pin fill={brand.teal} ink={brand.cream} n={l.n} size={26} />}
        </MapMarker>
      ))}
      {pin ? (
        <MapMarker at={pin}>
          <Pin fill={brand.zest} ink={brand.tealDark} icon="pin" size={40} />
        </MapMarker>
      ) : null}
    </OtwMap>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  fill: { flex: 1 },
  map: { height: 300, borderRadius: 22 },
  picker: { height: 220, borderRadius: 18 },
  pinWrap: { alignItems: 'center' },
  pin: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: brand.cream },
  pinNum: { fontFamily: font.display, fontSize: 15 },
  tail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
});
