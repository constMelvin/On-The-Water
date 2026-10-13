import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Avatar, TONE_COLORS } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { Pin, regionFor } from '@/components/maps';
import { Sheet } from '@/components/Sheet';
import { ErrorState, Skeleton } from '@/components/States';
import { Button, Card, IconButton, PageHead, Tag, type TagVariant } from '@/components/ui';
import { updateTravelStatus } from '@/lib/api/gala';
import type { TravelStatus } from '@/lib/api/rooms';
import { distanceKm, formatDistance } from '@/lib/otw/distance';
import { toast } from '@/lib/otw/feedback';
import { useLocations, useTabState } from '@/lib/otw/gala-queries';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { startSharing, stopSharing, useSharing } from '@/lib/otw/location-share';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GalaPage } from './GalaShell';

/**
 * "Who's OTW?" (port of otw-client/src/components/gala/map/*). Travel status works without GPS (PUT
 * .../members/me/travel-status); live location is opt-in (lib/otw/location-share.ts) and the map shows everyone
 * sharing from GET .../locations, kept fresh by realtime location.*.
 */
interface TravelMeta {
  label: string;
  tag: TagVariant;
  icon: IconName;
  bg: string;
  fg: string;
  moving: boolean;
}
export const TRAVEL: Record<TravelStatus, TravelMeta> = {
  STILL_HOME: { label: 'Still at home', tag: 'l-home', icon: 'home', bg: brand.cream, fg: brand.tealDark, moving: false },
  ON_THE_WAY: { label: 'On the way', tag: 'l-otw', icon: 'nav', bg: brand.teal, fg: brand.cream, moving: true },
  ALMOST_THERE: { label: 'Almost there', tag: 'l-almost', icon: 'sparkle', bg: brand.zest, fg: brand.tealDark, moving: true },
  ARRIVED: { label: 'Already there', tag: 'l-there', icon: 'flag', bg: brand.rosy, fg: brand.cream, moving: false },
};
const ORDER: TravelStatus[] = ['ARRIVED', 'ALMOST_THERE', 'ON_THE_WAY', 'STILL_HOME'];
const CHOICES: TravelStatus[] = ['STILL_HOME', 'ON_THE_WAY', 'ALMOST_THERE', 'ARRIVED'];

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return mins < 1 ? 'just now' : mins === 1 ? '1 min ago' : `${mins} min ago`;
}

export function Location() {
  const { roomId, room, role, memberRows, myUserId, toneOf, members, phase, setViewState } = useGala();
  const { colors, scheme } = useTheme();
  const qc = useQueryClient();
  const q = useLocations();
  const state = useTabState(q);
  const sharing = useSharing();
  const [asking, setAsking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<TravelStatus | null>(null);
  const mapRef = useRef<MapView>(null);

  const locations = useMemo(() => q.data ?? [], [q.data]);
  const byUser = new Map(locations.map((l) => [l.userId, l]));
  const meeting = room?.meetingLat != null && room?.meetingLng != null ? { lat: room.meetingLat, lng: room.meetingLng, label: room.meetingLabel } : null;
  const destination = room?.destinationLat != null && room?.destinationLng != null ? { lat: room.destinationLat, lng: room.destinationLng, label: room.destination } : null;

  const initial = useMemo(
    () =>
      regionFor([
        ...locations.map((l) => ({ latitude: l.lat, longitude: l.lng })),
        ...(destination ? [{ latitude: destination.lat, longitude: destination.lng }] : []),
        ...(meeting ? [{ latitude: meeting.lat, longitude: meeting.lng }] : []),
      ]),
    // Starting view only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.isSuccess],
  );

  const sel = selected ? memberRows.find((m) => m.userId === selected) : null;
  const selLoc = selected ? byUser.get(selected) : undefined;
  useEffect(() => {
    if (selLoc) mapRef.current?.animateToRegion({ latitude: selLoc.lat, longitude: selLoc.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
  }, [selLoc?.lat, selLoc?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'loading' || !roomId) {
    return (
      <GalaPage>
        <Skeleton label="Loading the map" />
      </GalaPage>
    );
  }
  if (state === 'error') {
    return (
      <GalaPage>
        <ErrorState
          kind="dashboard"
          title="The map didn't load."
          body="Nobody's location was lost. Try again."
          onRetry={async () => {
            setViewState('default');
            return (await q.refetch()).isSuccess;
          }}
        />
      </GalaPage>
    );
  }

  const allowed = role === 'leader' || !!room?.permissions.locationSharingEnabled;
  const mineHere = sharing.status !== 'off' && sharing.roomId === roomId ? sharing : null;
  const sharingNow = mineHere?.status === 'on' || mineHere?.status === 'starting' || byUser.has(myUserId ?? '');
  const me = memberRows.find((m) => m.userId === myUserId);
  const myStatus = statusOverride ?? me?.travelStatus ?? 'STILL_HOME';
  const statusOf = (userId: string, fallback: TravelStatus) => (userId === myUserId ? myStatus : fallback);
  const away = (userId: string) => {
    const loc = byUser.get(userId);
    return loc && destination ? `${formatDistance(distanceKm(loc, destination))} from the gala` : null;
  };
  const count = (st: TravelStatus) => memberRows.filter((m) => statusOf(m.userId, m.travelStatus) === st).length;
  const list = [...memberRows].sort((a, b) => ORDER.indexOf(statusOf(a.userId, a.travelStatus)) - ORDER.indexOf(statusOf(b.userId, b.travelStatus)));

  const flyTo = (lat: number, lng: number) => mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);

  const setStatus = (st: TravelStatus) => {
    setStatusOverride(st);
    updateTravelStatus(roomId, st)
      .then(() => {
        toast(`Status: ${TRAVEL[st].label}.`);
        void qc.invalidateQueries({ queryKey: featureKey(roomId, 'members') });
        void qc.invalidateQueries({ queryKey: featureKey(roomId, 'summary') });
      })
      .catch((e: unknown) => toast(e instanceof Error && e.message ? e.message : "Couldn't update your status.", 'err'))
      .finally(() => setStatusOverride(null));
  };

  const stop = async () => {
    await stopSharing();
    qc.setQueryData(
      featureKey(roomId, 'locations'),
      locations.filter((l) => l.userId !== myUserId),
    );
    toast('Stopped sharing your location.');
  };

  const bar = (opts: { icon: IconName; title: string; body: string; tone: 'plain' | 'deny' | 'on'; action?: { label: string; onPress: () => void; variant?: 'rosy' | 'cream'; icon?: IconName } }) => {
    const bg = opts.tone === 'on' ? brand.teal : opts.tone === 'deny' ? colors.surface : colors.surface2;
    const fg = opts.tone === 'on' ? brand.cream : opts.tone === 'deny' ? colors.rosyInk : colors.text;
    return (
      <View style={[styles.lbar, { backgroundColor: bg }, opts.tone === 'deny' && { borderWidth: 3, borderColor: brand.rosyDark }]}>
        <View style={styles.lbarTop}>
          <Icon name={opts.icon} size={22} color={fg} />
          <View style={styles.flex}>
            <Text style={[styles.lbarTitle, { color: fg }]}>{opts.title}</Text>
            <Text style={[styles.lbarBody, { color: fg }]}>{opts.body}</Text>
          </View>
        </View>
        {opts.action ? <Button sm fw={false} variant={opts.action.variant ?? 'rosy'} icon={opts.action.icon} label={opts.action.label} onPress={opts.action.onPress} /> : null}
      </View>
    );
  };

  let banner;
  if (!allowed) {
    banner = bar({ icon: 'lock', tone: 'plain', title: 'Live location is off for this gala.', body: 'The Gala Leader turned it off. You can still set your status by hand below.' });
  } else if (mineHere?.status === 'denied') {
    banner = bar({
      icon: 'alert',
      tone: 'deny',
      title: 'Location is blocked for OTW.',
      body: 'Turn it on in your phone settings (Apps › OTW › Location: Allow), then try again. You can still set your status by hand below.',
      action: { label: 'Try again', icon: 'refresh', onPress: () => startSharing(roomId) },
    });
  } else if (mineHere?.status === 'error') {
    banner = bar({ icon: 'alert', tone: 'deny', title: "Your location isn't being shared.", body: mineHere.message, action: { label: 'Try again', icon: 'refresh', onPress: () => startSharing(roomId) } });
  } else if (sharingNow) {
    banner = bar({
      icon: 'nav',
      tone: 'on',
      title: mineHere ? "You're sharing your location." : 'Your location is shared from another device.',
      body: `Visible to the ${memberRows.length} ${memberRows.length === 1 ? 'person' : 'people'} in this gala, only while sharing is on.`,
      action: { label: 'Stop sharing', variant: 'cream', onPress: () => void stop() },
    });
  } else {
    banner = bar({ icon: 'lock', tone: 'plain', title: 'Your location is private.', body: 'Nobody sees where you are until you choose to share.', action: { label: 'Share my location', onPress: () => setAsking(true) } });
  }

  const selMeta = sel ? TRAVEL[statusOf(sel.userId, sel.travelStatus)] : null;

  return (
    <GalaPage>
      <PageHead title="Who's actually OTW?" sub="Less “Nasaan ka na?” More “2 minutes away.”" tag={<Tag icon="nav">OTW na ba talaga?</Tag>} />
      {phase === 'planning' ? <Text style={[styles.fine, { color: colors.text }]}>Most people share on gala day, but it works any time.</Text> : null}
      {banner}

      <Card style={styles.mapcard}>
        <MapView ref={mapRef} style={styles.map} initialRegion={initial} userInterfaceStyle={scheme} toolbarEnabled={false} onPress={() => setSelected(null)}>
          {locations.map((l) => {
            const m = memberRows.find((x) => x.userId === l.userId);
            if (!m) return null;
            const meta = TRAVEL[statusOf(l.userId, m.travelStatus)];
            const tone = TONE_COLORS[toneOf(l.userId) ?? 'teal'];
            return (
              <Marker key={l.userId} coordinate={{ latitude: l.lat, longitude: l.lng }} onPress={() => setSelected(l.userId)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={[styles.mpin, { backgroundColor: tone.bg, borderColor: meta.bg === brand.cream ? brand.tealDark : meta.bg }]}>
                  <Text style={[styles.mpinText, { color: tone.fg }]}>{(m.nickname[0] ?? '?').toUpperCase()}</Text>
                </View>
              </Marker>
            );
          })}
          {destination ? (
            <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title={destination.label} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
              <Pin fill={brand.rosy} ink={brand.cream} icon="pin" size={36} />
            </Marker>
          ) : null}
          {meeting ? (
            <Marker coordinate={{ latitude: meeting.lat, longitude: meeting.lng }} title={meeting.label ?? 'Meeting point'} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
              <Pin fill={brand.zest} ink={brand.tealDark} icon="flag" size={32} />
            </Marker>
          ) : null}
        </MapView>
        {destination || meeting ? (
          <View style={styles.jump}>
            {destination ? <Button sm fw={false} variant="zest" icon="pin" label="Find the gala" onPress={() => flyTo(destination.lat, destination.lng)} /> : null}
            {meeting ? <Button sm fw={false} variant="cream" icon="flag" label="Meeting point" onPress={() => flyTo(meeting.lat, meeting.lng)} /> : null}
          </View>
        ) : null}
        <Text style={[styles.place, { color: colors.text }]}>
          {destination
            ? `Gala: ${destination.label}`
            : role === 'leader'
              ? 'Pin the destination in Settings so everyone sees where the gala is.'
              : 'The Gala Leader hasn’t pinned the destination on the map yet.'}
        </Text>
        <View style={styles.mapstat}>
          <Tag variant={TRAVEL.ARRIVED.tag} icon={TRAVEL.ARRIVED.icon}>{`${count('ARRIVED')} arrived`}</Tag>
          <Tag variant={TRAVEL.ALMOST_THERE.tag} icon={TRAVEL.ALMOST_THERE.icon}>{`${count('ALMOST_THERE')} almost there`}</Tag>
          <Tag variant={TRAVEL.ON_THE_WAY.tag} icon={TRAVEL.ON_THE_WAY.icon}>{`${count('ON_THE_WAY')} on the way`}</Tag>
        </View>
        {sel && selMeta ? (
          <View style={[styles.callout, { backgroundColor: colors.surface2 }]}>
            <Avatar name={sel.nickname} tone={toneOf(sel.userId)} size={36} userId={sel.userId} />
            <View style={styles.flex}>
              <Text style={[styles.cname, { color: colors.text }]}>
                {sel.nickname}
                {sel.userId === myUserId ? ' (you)' : ''}
              </Text>
              <Text style={[styles.fine, { color: colors.text }]}>
                {selMeta.label}
                {byUser.get(sel.userId) ? ` · updated ${ago(byUser.get(sel.userId)!.updatedAt)}` : ''}
                {away(sel.userId) ? ` · ${away(sel.userId)}` : ''}
              </Text>
            </View>
            <IconButton icon="x" size={18} label="Close" onPress={() => setSelected(null)} />
          </View>
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.h3, { color: colors.text }]}>Your status</Text>
        <Text style={[styles.fine, { color: colors.text }]}>Works with or without GPS. Friends see it either way.</Text>
        <View style={styles.choices}>
          {CHOICES.map((k) => {
            const m = TRAVEL[k];
            const on = myStatus === k;
            return (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setStatus(k)}
                style={[styles.choice, { backgroundColor: m.bg, borderColor: on ? colors.focus : m.bg === brand.cream ? brand.tealDark : m.bg }]}>
                <Icon name={m.icon} size={22} color={m.fg} />
                <Text style={[styles.choiceText, { color: m.fg }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Text style={[styles.h3, { color: colors.text }]}>Everyone</Text>
        {locations.length === 0 ? <Text style={[styles.fine, { color: colors.text }]}>Walang nagse-share pa. Everyone&apos;s still private.</Text> : null}
        {list.map((m) => {
          const loc = byUser.get(m.userId);
          const meta = TRAVEL[statusOf(m.userId, m.travelStatus)];
          const online = members.find((x) => x.id === m.userId)?.on === 1;
          return (
            <View key={m.userId} style={[styles.person, { borderTopColor: colors.line }, !loc && { opacity: 0.8 }]}>
              <Avatar name={m.nickname} tone={toneOf(m.userId)} size={40} online={online} userId={m.userId} />
              <View style={styles.flex}>
                <View style={styles.ptop}>
                  <Text style={[styles.pname, { color: colors.text }]}>
                    {m.nickname}
                    {m.userId === myUserId ? ' (you)' : ''}
                  </Text>
                  <Tag variant={meta.tag} icon={meta.icon}>
                    {meta.label}
                  </Tag>
                </View>
                <View style={styles.pbot}>
                  <Text style={[styles.fine, styles.flex, { color: colors.text }]}>
                    {loc ? `Sharing live · ${ago(loc.updatedAt)}${away(m.userId) ? ` · ${away(m.userId)}` : ''}` : 'Not sharing · private'}
                  </Text>
                  {loc ? <Button sm fw={false} variant="cream" icon="pin" label="Locate" accessibilityLabel={`Show ${m.nickname} on the map`} onPress={() => setSelected(m.userId)} /> : null}
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={[styles.h3, { color: colors.text }]}>Privacy</Text>
        <PrivacyList />
      </Card>

      {asking ? (
        <Sheet
          title="Share your location with the gala?"
          onClose={() => setAsking(false)}
          footer={
            <>
              <Button
                label="Share my location"
                onPress={() => {
                  setAsking(false);
                  startSharing(roomId);
                  toast("You're sharing your location.");
                }}
              />
              <Button variant="ghost" label="Not now" onPress={() => setAsking(false)} />
            </>
          }>
          <PrivacyList />
          <Text style={[styles.fine, { color: colors.text }]}>Your phone will ask for permission next.</Text>
        </Sheet>
      ) : null}
    </GalaPage>
  );
}

function PrivacyList() {
  const { colors } = useTheme();
  const row = (icon: IconName, b: string, t: string) => (
    <View style={styles.mini}>
      <Icon name={icon} size={18} color={brand.rosy} />
      <Text style={[styles.miniText, { color: colors.text }]}>
        <Text style={{ fontFamily: font.bodyHeavy }}>{b}</Text> {t}
      </Text>
    </View>
  );
  return (
    <>
      {row('users', 'Who can see it:', 'only people who joined this gala.')}
      {row('clock', 'How long:', 'only while sharing is on. It stops 3 hours after the gala ends.')}
      {row('x', 'Stopping:', 'one tap on this screen, any time.')}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fine: { fontFamily: font.body, fontSize: 14, opacity: 0.9 },
  h3: { fontFamily: font.displaySemi, fontSize: 20 },
  lbar: { borderRadius: 22, padding: 14, gap: 10 },
  lbarTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  lbarTitle: { fontFamily: font.bodyHeavy, fontSize: 15 },
  lbarBody: { fontFamily: font.bodyBold, fontSize: 13, lineHeight: 18 },
  mapcard: { padding: 8, gap: 10 },
  map: { height: 320, borderRadius: 20, overflow: 'hidden' },
  mpin: { width: 38, height: 38, borderRadius: 19, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  mpinText: { fontFamily: font.displaySemi, fontSize: 16 },
  jump: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },
  place: { fontFamily: font.bodyHeavy, fontSize: 13, paddingHorizontal: 6 },
  mapstat: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 4, paddingBottom: 4 },
  callout: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, padding: 10 },
  cname: { fontFamily: font.bodyHeavy, fontSize: 15 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { width: '48%', flexGrow: 1, borderWidth: 4, borderRadius: 20, paddingVertical: 12, alignItems: 'center', gap: 4 },
  choiceText: { fontFamily: font.displaySemi, fontSize: 14 },
  person: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderTopWidth: 2, borderStyle: 'dashed', paddingTop: 10 },
  ptop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  pname: { fontFamily: font.bodyHeavy, fontSize: 15 },
  pbot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  mini: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  miniText: { flex: 1, fontFamily: font.body, fontSize: 14, lineHeight: 20 },
});
