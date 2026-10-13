import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { getAllMyRooms } from '@/api/galas';
import type { MyRoomsView } from '@/api/types';
import { useState } from 'react';
import { GalaCard } from '@/components/GalaCard';
import { CalendarView } from '@/components/me/CalendarView';
import { MeTabs } from '@/components/me/MeTabs';
import { kv } from '@/lib/otw/kv';
import { Icon } from '@/components/Icon';
import { Button, Card, IconBlob, Loading, PageHead, Screen, SegmentedControl } from '@/components/ui';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/** Same headings and order as the web My Galas (otw-client/src/app/me/galas/page.tsx). */
const GROUPS: { view: MyRoomsView; group: 'ongoing' | 'upcoming' | 'done'; title: string }[] = [
  { view: 'ongoing', group: 'ongoing', title: 'Ongoing now' },
  { view: 'upcoming', group: 'upcoming', title: 'Coming up' },
  { view: 'completed', group: 'done', title: 'Completed' },
];

type View3 = 'upcoming' | 'month' | 'week';
/** The last choice is remembered on this phone (same key as the web). */
const VIEW_KEY = 'otw:cal-view';

export default function MyGalas() {
  const { colors } = useTheme();
  const [view, setViewState] = useState<View3>(() => {
    const saved = kv.getItem(VIEW_KEY);
    return saved === 'month' || saved === 'week' ? saved : 'upcoming';
  });
  const setView = (v: View3) => {
    setViewState(v);
    kv.setItem(VIEW_KEY, v);
  };
  const results = useQueries({
    queries: GROUPS.map((g) => ({ queryKey: ['me', 'rooms', g.view], queryFn: () => getAllMyRooms(g.view) })),
  });

  const loading = results.some((q) => q.isPending);
  const failed = results.filter((q) => q.isError);
  const empty = !loading && failed.length === 0 && results.every((q) => !q.data?.length);

  return (
    <Screen>
      <MeTabs active="galas" />
      <PageHead title="Your Gala Calendar" sub="Keep track of what's coming up, what's being planned, and what's already happened." />
      <View style={styles.actions}>
        <Button sm fw={false} icon="plus" label="Plan a Gala" onPress={() => router.push('/create')} />
        <Button sm fw={false} variant="zest" icon="enter" label="Join a Gala" onPress={() => router.push('/join')} />
      </View>

      <SegmentedControl<View3>
        label="Calendar view"
        value={view}
        onChange={setView}
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'month', label: 'Month' },
          { value: 'week', label: 'Week' },
        ]}
      />

      {failed.length > 0 ? (
        <Card style={styles.errCard}>
          <View style={styles.errRow}>
            <View style={styles.errChip}>
              <Icon name="alert" size={24} color={brand.tealDark} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.errTitle, { color: colors.text }]}>Hindi ma-load ang mga gala mo.</Text>
              <Text style={[styles.errSub, { color: colors.text }]}>Check your connection, then try again.</Text>
            </View>
          </View>
          <Button sm variant="teal" icon="refresh" label="Try again" onPress={() => failed.forEach((q) => void q.refetch())} />
        </Card>
      ) : null}

      {loading ? <Loading label="Loading your galas" /> : null}

      {!loading && view !== 'upcoming' ? (
        <CalendarView mode={view} groups={GROUPS.map((g, i) => ({ group: g.group, rooms: results[i].data ?? [] }))} />
      ) : null}

      {empty && view === 'upcoming' ? (
        <View style={styles.gate}>
          <IconBlob name="calendar" index={2} size={96} iconSize={44} />
          <Text style={[styles.gateTitle, { color: colors.text }]}>Wala pang ganap.</Text>
          <Text style={[styles.gateSub, { color: colors.text }]}>Sounds like a good time to plan something.</Text>
          <Button icon="plus" label="Plan a Gala" onPress={() => router.push('/create')} />
          <Button variant="zest" icon="enter" label="Join a Gala" onPress={() => router.push('/join')} />
        </View>
      ) : null}

      {GROUPS.map(({ view: v, group, title }, i) => {
        const list = results[i].data ?? [];
        if (view !== 'upcoming' || !list.length) return null;
        return (
          <View key={v} style={styles.group} accessibilityLabel={title}>
            <Text style={[styles.gh, { color: colors.text }]}>{title}</Text>
            {list.map((room) => (
              <GalaCard key={room.roomId} room={room} group={group} />
            ))}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  group: { gap: 14, marginTop: 10 },
  gh: { fontFamily: font.displaySemi, fontSize: 22 },
  errCard: { gap: 12 },
  errRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  errChip: { width: 60, height: 60, borderRadius: 22, backgroundColor: brand.zest, alignItems: 'center', justifyContent: 'center' },
  errTitle: { fontFamily: font.displaySemi, fontSize: 20 },
  errSub: { fontFamily: font.body, fontSize: 15 },
  gate: { alignItems: 'center', gap: 14, paddingVertical: 40 },
  gateTitle: { fontFamily: font.displaySemi, fontSize: 30, textAlign: 'center' },
  gateSub: { fontFamily: font.bodyBold, fontSize: 17, textAlign: 'center' },
});
