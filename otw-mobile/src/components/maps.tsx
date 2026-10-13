/**
 * Maps for the gala screens (react-native-maps; the web uses MapLibre + OpenFreeMap). Same content as the web:
 * numbered stop pins, the gala's flag, a driving route from the public OSRM server (dashed straight line when
 * it can't be reached), and a tap-to-pin picker.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, Polyline, type LatLng, type Region } from 'react-native-maps';
import { Icon, type IconName } from './Icon';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/** Manila, when there is nothing to centre on. */
export const MANILA = { latitude: 14.5995, longitude: 120.9842 };

export interface Landmark {
  lat: number;
  lng: number;
  label: string;
  kind: 'stop' | 'gala';
  /** Stop number (kind 'stop'). */
  n?: number;
}

/** Region that fits every point (or Manila). */
export function regionFor(points: LatLng[], pad = 1.6): Region {
  if (!points.length) return { ...MANILA, latitudeDelta: 0.3, longitudeDelta: 0.3 };
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.01, (maxLat - minLat) * pad),
    longitudeDelta: Math.max(0.01, (maxLng - minLng) * pad),
  };
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

/** Driving route through the points (cached per point list). Null while loading or when OSRM is down. */
function useDrivingRoute(points: LatLng[]): LatLng[] | null | 'failed' {
  const key = points.map((p) => `${p.longitude.toFixed(5)},${p.latitude.toFixed(5)}`).join(';');
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
        const line = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
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
  (JSON.parse(pinKey) as ([number, number] | null)[]).filter((p): p is [number, number] => !!p).map(([latitude, longitude]) => ({ latitude, longitude }));

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
  const { scheme } = useTheme();
  const pinned = stops.filter((s) => s.lat != null && s.lng != null);
  // Recompute only when a pin actually moves (the stop objects are new on every render).
  const pinKey = JSON.stringify([...pinned.map((s) => [s.lat, s.lng]), destination ? [destination.lat, destination.lng] : null]);
  const points = pointsOf(pinKey);
  const route = useDrivingRoute(points);
  const mapRef = useRef<MapView>(null);
  useEffect(() => {
    const pts = pointsOf(pinKey);
    if (pts.length) mapRef.current?.animateToRegion(regionFor(pts), 400);
  }, [pinKey]);

  return (
    <MapView ref={mapRef} style={[styles.map, style]} initialRegion={regionFor(points)} userInterfaceStyle={scheme} toolbarEnabled={false}>
      {route && route !== 'failed' ? <Polyline coordinates={route} strokeColor={brand.rosy} strokeWidth={5} /> : null}
      {route === 'failed' ? <Polyline coordinates={points} strokeColor={brand.rosy} strokeWidth={4} lineDashPattern={[10, 8]} /> : null}
      {pinned.map((s) => (
        <Marker key={s.id} coordinate={{ latitude: s.lat!, longitude: s.lng! }} title={`${s.n}. ${s.title}`} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          <Pin fill={s.fill} ink={s.ink} n={s.n} />
        </Marker>
      ))}
      {destination ? (
        <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title={destination.label} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          <Pin fill={brand.rosy} ink={brand.cream} icon="flag" size={38} />
        </Marker>
      ) : null}
    </MapView>
  );
}

/** Tap to drop / move a pin; existing stops and the gala show as small landmarks. */
export function MapPicker({
  pin,
  onPick,
  landmarks = [],
  style,
}: {
  pin: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
  landmarks?: Landmark[];
  style?: StyleProp<ViewStyle>;
}) {
  const { scheme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const initial = useMemo(
    () =>
      pin
        ? { latitude: pin.lat, longitude: pin.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        : regionFor(landmarks.map((l) => ({ latitude: l.lat, longitude: l.lng }))),
    // Only the first render picks the starting view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    if (pin) mapRef.current?.animateToRegion({ latitude: pin.lat, longitude: pin.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 350);
  }, [pin?.lat, pin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapView
      ref={mapRef}
      style={[styles.picker, style]}
      initialRegion={initial}
      userInterfaceStyle={scheme}
      toolbarEnabled={false}
      onPress={(e) => onPick(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}>
      {landmarks.map((l, i) => (
        <Marker key={`${l.kind}${i}`} coordinate={{ latitude: l.lat, longitude: l.lng }} title={l.label} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          {l.kind === 'gala' ? <Pin fill={brand.rosy} ink={brand.cream} icon="flag" size={28} /> : <Pin fill={brand.teal} ink={brand.cream} n={l.n} size={26} />}
        </Marker>
      ))}
      {pin ? (
        <Marker coordinate={{ latitude: pin.lat, longitude: pin.lng }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          <Pin fill={brand.zest} ink={brand.tealDark} icon="pin" size={40} />
        </Marker>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 300, borderRadius: 22, overflow: 'hidden' },
  picker: { height: 220, borderRadius: 18, overflow: 'hidden' },
  pinWrap: { alignItems: 'center' },
  pin: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: brand.cream },
  pinNum: { fontFamily: font.display, fontSize: 15 },
  tail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
});
