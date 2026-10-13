import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorState, Skeleton } from '@/components/States';
import { Button, IconBlob } from '@/components/ui';
import { peso } from '@/lib/otw/data';
import { useGala } from '@/lib/otw/gala-store';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GalaPage } from './GalaShell';
import { galaHref } from './nav';

/** Recap of a finished gala (port of otw-client/src/components/gala/recap/Recap.tsx). Numbers from GET /summary. */
export function Recap() {
  const { summary, liveState, viewState, retry, roomId } = useGala();
  const { colors } = useTheme();
  const state = viewState !== 'default' ? viewState : liveState;
  const go = (seg: string) => () => router.navigate(galaHref(roomId!, seg) as Href);
  if (state === 'error' && !summary) return <GalaPage><ErrorState kind="completed" onRetry={retry} /></GalaPage>;
  if (!summary || state === 'loading') return <GalaPage><Skeleton label="Loading the recap" /></GalaPage>;
  const went = summary.rsvp.going;
  const tile = (n: string | number, label: string, bg: string, fg: string) => (
    <View style={styles.cell}><View style={[styles.tile, { backgroundColor: bg }]}><Text style={[styles.num, { color: fg }]}>{n}</Text><Text style={[styles.lbl, { color: fg }]}>{label}</Text></View></View>
  );
  return (
    <GalaPage>
      <View style={[styles.hero, { backgroundColor: colors.secRosy }]}>
        <IconBlob name="burst" size={96} iconSize={44} />
        <Text style={styles.h1}>You made it happen.</Text>
        <Text style={styles.lead}>From “G tayo?” to an actual day on the calendar.</Text>
      </View>
      <View style={styles.tiles}>
        {tile(went, went === 1 ? 'person went' : 'people went', brand.teal, brand.cream)}
        {tile(summary.itineraryStops, 'stops on the route', brand.zest, brand.tealDark)}
        {tile(peso(summary.totalSpent), `spent${summary.settled ? ' · all settled' : ''}`, brand.blossom, brand.tealDark)}
        {tile(summary.photoCount, 'photos in the Dump', colors.surface, colors.text)}
      </View>
      {summary.memberCount >= 3 ? (
        <View style={[styles.awards, { backgroundColor: colors.secZest }]}>
          <Text style={[styles.h2, { color: colors.secInk }]}>Barkada Awards</Text>
          <Text style={[styles.lbl, { color: colors.secInk }]}>Vote for the bida ng barkada, then see who won.</Text>
          <Button label="Open the awards" onPress={go('awards')} />
        </View>
      ) : null}
      <Button variant="teal" label="View Gala Dump" onPress={go('dump')} />
      <Button variant="zest" label="View Expenses" onPress={go('ambagan')} />
      <Button variant="cream" label="View Itinerary" onPress={go('route')} />
      <Button label="Plan Another Gala" onPress={() => router.navigate('/create')} />
      <Text style={[styles.closing, { color: colors.text }]}>Until the next “G tayo?”</Text>
    </GalaPage>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 30, padding: 22, gap: 10, alignItems: 'center' },
  h1: { fontFamily: font.displaySemi, fontSize: 30, color: brand.cream, textAlign: 'center' },
  lead: { fontFamily: font.bodyBold, fontSize: 17, color: brand.cream, textAlign: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '50%', padding: 5 },
  tile: { borderRadius: 22, padding: 14, minHeight: 90 },
  num: { fontFamily: font.display, fontSize: 26 },
  lbl: { fontFamily: font.bodyHeavy, fontSize: 13 },
  awards: { borderRadius: 26, padding: 18, gap: 8 },
  h2: { fontFamily: font.displaySemi, fontSize: 22 },
  closing: { fontFamily: font.displaySemi, fontSize: 18, textAlign: 'center' },
});
