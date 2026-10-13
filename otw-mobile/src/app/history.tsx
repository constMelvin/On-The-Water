import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api, isApiError } from '@/api/client';
import { getAllMyRooms } from '@/api/galas';
import type { MyRoomsView } from '@/api/types';
import { GalaCard } from '@/components/GalaCard';
import { MeTabs } from '@/components/me/MeTabs';
import { Button, Card, Fine, IconBlob, Loading, PageHead, Screen } from '@/components/ui';
import { toast } from '@/lib/otw/feedback';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/** Gala History (port of otw-client/src/app/me/history/page.tsx): what you made happen, plus Mga Drawing. */
interface Stats {
  completed: number;
  people: number;
  archived: number;
}

function reviveError(e: unknown): string {
  if (isApiError(e, 'ROOM_NOT_FOUND')) return 'That gala is gone.';
  if (isApiError(e) && e.status === 403) return 'Only the Gala Leader can revive this.';
  if (isApiError(e) && e.status === 409) return 'This gala changed. Refresh and try again.';
  return 'Hindi na-revive. Try again.';
}

const VIEWS: MyRoomsView[] = ['completed', 'archived'];

export default function History() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ['me', 'stats'], queryFn: () => api<Stats>('/me/rooms/stats') });
  const [completed, archived] = useQueries({ queries: VIEWS.map((v) => ({ queryKey: ['me', 'rooms', v], queryFn: () => getAllMyRooms(v) })) });
  const [reviving, setReviving] = useState<ReadonlySet<string>>(new Set());

  const revive = useMutation({
    mutationFn: (roomId: string) => api(`/rooms/${roomId}/restore`, { method: 'POST' }),
    onMutate: (roomId) => setReviving((s) => new Set(s).add(roomId)),
    onSuccess: (_d, roomId) => {
      toast('Revived. Balik na sa plano.');
      return Promise.all([qc.invalidateQueries({ queryKey: ['me'] }), qc.invalidateQueries({ queryKey: ['room', roomId] })]);
    },
    onError: (e) => toast(reviveError(e), 'err'),
    onSettled: (_d, _e, roomId) =>
      setReviving((s) => {
        const next = new Set(s);
        next.delete(roomId);
        return next;
      }),
  });

  const queries = [stats, completed, archived];
  const loading = queries.some((q) => q.isPending);
  const failed = queries.filter((q) => q.isError);
  const done = completed.data ?? [];
  const drawer = archived.data ?? [];

  const tile = (value: number | undefined, label: string, bg: string, fg: string, sh: string) => (
    <View style={styles.cell}>
      <Card bg={bg} shadow={sh} style={styles.tile}>
        <Text style={[styles.num, { color: fg }]}>{value ?? '-'}</Text>
        <Text style={[styles.lbl, { color: fg }]}>{label}</Text>
      </Card>
    </View>
  );

  return (
    <Screen>
      <MeTabs active="history" />
      <PageHead title="Gala History" sub="Everything you made happen, plus the plans still in the drawer." />
      {failed.length > 0 ? (
        <Card>
          <Text style={[styles.h3, { color: colors.text }]}>Hindi ma-load ang history mo.</Text>
          <Fine>Check your connection, then try again.</Fine>
          <Button sm fw={false} variant="teal" icon="refresh" label="Try again" onPress={() => failed.forEach((q) => void q.refetch())} />
        </Card>
      ) : null}
      <View style={styles.tiles}>
        {tile(stats.data?.completed, 'made it happen', brand.zest, brand.tealDark, brand.zestDark)}
        {tile(stats.data?.people, 'people', brand.blossom, brand.tealDark, brand.rosy)}
        {tile(stats.data?.archived, 'in Mga Drawing', brand.teal, brand.cream, brand.tealDark)}
      </View>
      {loading ? <Loading label="Loading your history" /> : null}

      <Text style={[styles.gh, { color: colors.text }]}>Completed</Text>
      {!completed.isPending && done.length === 0 && !completed.isError ? (
        <View style={styles.gate}>
          <IconBlob name="check" index={2} size={96} iconSize={44} />
          <Text style={[styles.sub, { color: colors.text }]}>Wala pang natapos na gala. Soon.</Text>
        </View>
      ) : null}
      {done.map((room) => (
        <GalaCard key={room.roomId} room={room} group="done" />
      ))}

      <Text style={[styles.gh, { color: colors.text }]}>Mga Drawing</Text>
      <Fine>Plans that got shelved. No judgment, and you can revive any of them.</Fine>
      {!archived.isPending && drawer.length === 0 && !archived.isError ? <Fine>Walang nakatabi. Lahat ng plano mo, buhay pa.</Fine> : null}
      {drawer.map((room) => (
        <GalaCard
          key={room.roomId}
          room={room}
          group="draw"
          action={
            room.myRole === 'HOST' ? (
              <Button
                sm
                variant="teal"
                label={reviving.has(room.roomId) ? 'Reviving...' : 'Revive'}
                accessibilityLabel={`Revive ${room.title}`}
                disabled={reviving.has(room.roomId)}
                onPress={() => revive.mutate(room.roomId)}
              />
            ) : null
          }
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', marginHorizontal: -5 },
  cell: { flex: 1, padding: 5 },
  tile: { padding: 12, gap: 2, minHeight: 92 },
  num: { fontFamily: font.display, fontSize: 28 },
  lbl: { fontFamily: font.bodyHeavy, fontSize: 12 },
  h3: { fontFamily: font.displaySemi, fontSize: 20 },
  gh: { fontFamily: font.displaySemi, fontSize: 22, marginTop: 10 },
  gate: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  sub: { fontFamily: font.bodyBold, fontSize: 17, textAlign: 'center' },
});
