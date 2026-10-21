import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import type { NotificationDto, Page } from '@/api/types';
import { Button, Card, ErrorNote, IconBlob, Loading, PageHead, Screen, Tag } from '@/components/ui';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

const LIMIT = 20;

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Notifications are rows in Postgres, not realtime: this list refetches on focus / foreground. */
export default function Notifications() {
  const { colors } = useTheme();
  const qc = useQueryClient();

  const list = useInfiniteQuery({
    queryKey: ['me', 'notifications'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<Page<NotificationDto>>(`/me/notifications?limit=${LIMIT}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`),
    getNextPageParam: (last) => last.nextCursor,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['me', 'notifications'] });
  const readOne = useMutation({ mutationFn: (id: string) => api(`/me/notifications/${id}/read`, { method: 'PATCH' }), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => api('/me/notifications/read-all', { method: 'POST' }), onSuccess: refresh });

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <Screen>
      <PageHead title="Notifications" sub="Ano'ng bago sa mga gala mo." tag={<Tag icon="bell">{unread ? `${unread} new` : 'All caught up'}</Tag>} />
      {unread ? <Button sm fw={false} variant="teal" icon="check" label="Mark all as read" onPress={() => readAll.mutate()} busy={readAll.isPending} /> : null}
      {list.isPending ? <Loading label="Loading notifications" /> : null}
      <ErrorNote message={list.error?.message ?? readAll.error?.message} />

      {list.isSuccess && items.length === 0 ? (
        <View style={styles.gate}>
          <IconBlob name="bell" index={3} size={96} iconSize={44} />
          <Text style={[styles.gateTitle, { color: colors.text }]}>Tahimik pa dito.</Text>
          <Text style={[styles.gateSub, { color: colors.text }]}>Updates from your galas show up here.</Text>
        </View>
      ) : null}

      {items.map((n) => (
        <Card
          key={n.id}
          shadow={n.readAt ? undefined : brand.rosyDark}
          onPress={() => {
            if (!n.readAt) readOne.mutate(n.id);
            // A chat mention or reply opens the gala's chat; everything else opens the gala.
            if (n.roomId && (n.type === 'MENTION' || n.type === 'REPLY')) router.push({ pathname: '/gala/[roomId]/chat', params: { roomId: n.roomId } });
            else if (n.roomId) router.push({ pathname: '/gala/[roomId]', params: { roomId: n.roomId } });
          }}
          style={styles.row}>
          <IconBlob name="bell" index={n.id.charCodeAt(0)} size={44} iconSize={22} color={n.readAt ? colors.text : brand.rosy} bg={colors.surface2} />
          <View style={styles.flex}>
            <Text style={[styles.title, { color: colors.text }]}>{n.title}</Text>
            <Text style={[styles.body, { color: colors.text }]}>{n.body}</Text>
            <Text style={[styles.when, { color: colors.text }]}>{ago(n.createdAt)}</Text>
          </View>
          {!n.readAt ? <View style={styles.dot} accessibilityLabel="Unread" /> : null}
        </Card>
      ))}

      {list.hasNextPage ? <Button variant="cream" label="Show more" onPress={() => void list.fetchNextPage()} busy={list.isFetchingNextPage} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 16 },
  title: { fontFamily: font.displaySemi, fontSize: 18 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  when: { fontFamily: font.bodyBold, fontSize: 12, opacity: 0.7, marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: brand.rosy, marginTop: 6 },
  gate: { alignItems: 'center', gap: 14, paddingVertical: 40 },
  gateTitle: { fontFamily: font.displaySemi, fontSize: 30 },
  gateSub: { fontFamily: font.bodyBold, fontSize: 17, textAlign: 'center' },
});
