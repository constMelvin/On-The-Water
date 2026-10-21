import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Button } from '@/components/ui';
import { getChatReactors } from '@/lib/api/gala';
import type { ChatMessageVM, ReactionType } from '@/lib/api/types';
import type { Member } from '@/lib/otw/data';
import { reactorsKey } from '@/lib/otw/live';
import { reactionTabs } from '@/lib/otw/reaction-tabs';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { BY_TYPE, REACTIONS } from './reactions';

type Tab = ReactionType | 'ALL';

/** All + this many reactions fit a phone's tab row; any more go under "More". */
const MAX_TABS = 3;

/**
 * "Who reacted" for one message: a tab per reaction (counts from the message) and a paged list.
 * My own row comes first and removes my reaction when tapped. chat.* realtime events refresh it.
 */
export function ReactionsSheet({
  roomId,
  message,
  members,
  nameOf,
  myUserId,
  onReact,
  onClose,
}: {
  roomId: string;
  message: ChatMessageVM;
  members: Member[];
  nameOf: (userId: string | null) => string;
  myUserId: string;
  onReact: (id: string, reaction: ReactionType | null) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const used = REACTIONS.filter((r) => (message.reactions?.[r.type] ?? 0) > 0);
  const total = used.reduce((n, r) => n + (message.reactions?.[r.type] ?? 0), 0);
  const [picked, setPicked] = useState<Tab>('ALL');
  // The picked reaction can vanish while the sheet is open (everyone removed it): fall back to All.
  const tab: Tab = picked !== 'ALL' && !used.some((r) => r.type === picked) ? 'ALL' : picked;
  const reaction = tab === 'ALL' ? null : tab;

  // Nothing left to show (e.g. I removed the only reaction): close.
  useEffect(() => {
    if (!total) onClose();
  }, [total, onClose]);

  const q = useInfiniteQuery({
    queryKey: reactorsKey(roomId, message.id, reaction),
    queryFn: ({ pageParam }) => getChatReactors(roomId, message.id, reaction, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const others = (q.data?.pages ?? []).flatMap((p) => p.items).filter((r) => r.userId !== myUserId);
  const mine = message.myReaction && (tab === 'ALL' || tab === message.myReaction) ? BY_TYPE.get(message.myReaction) : undefined;
  const toneOf = (id: string) => members.find((m) => m.id === id)?.c;

  return (
    <Sheet title="Reactions" onClose={onClose}>
      <ReactionTabs used={used} counts={message.reactions} total={total} value={tab} onChange={setPicked} />
      {mine ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Your reaction: ${mine.label}. Tap to remove`}
          onPress={() => onReact(message.id, null)}
          style={[styles.row, styles.mine, { backgroundColor: colors.surface2 }]}>
          <Avatar name={nameOf(myUserId)} tone={toneOf(myUserId)} size={36} userId={myUserId} />
          <View style={styles.flex}>
            <Text style={[styles.name, { color: colors.text }]}>You</Text>
            <Text style={[styles.sub, { color: colors.text }]}>Tap to remove</Text>
          </View>
          <Icon name={mine.icon} size={20} color={mine.color} />
        </Pressable>
      ) : null}
      {others.map((r) => {
        const look = BY_TYPE.get(r.reaction)!;
        const name = nameOf(r.userId);
        return (
          <View key={r.userId} style={styles.row} accessibilityLabel={`${name}: ${look.label}`}>
            <Avatar name={name} tone={toneOf(r.userId)} size={36} userId={r.userId} />
            <Text style={[styles.name, styles.flex, { color: colors.text }]}>{name}</Text>
            <Icon name={look.icon} size={20} color={look.color} />
          </View>
        );
      })}
      {q.isPending ? <Text style={[styles.sub, { color: colors.text }]}>Loading…</Text> : null}
      {q.isError ? <Text style={[styles.sub, { color: colors.text }]}>Couldn&apos;t load who reacted.</Text> : null}
      {q.hasNextPage ? (
        <Button sm fw={false} variant="ghost" label={q.isFetchingNextPage ? 'Loading…' : 'Show more'} disabled={q.isFetchingNextPage} onPress={() => void q.fetchNextPage()} />
      ) : null}
    </Sheet>
  );
}

/** One tab: text or icon + count, with a 3px underline when active. */
function TabButton({ on, label, onPress, children }: { on: boolean; label: string; onPress: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.tab, { borderBottomColor: on ? brand.teal : 'transparent', opacity: on ? 1 : 0.7 }]}>
      {typeof children === 'string' ? <Text style={[styles.tabText, { color: colors.text }, on && styles.tabOn]}>{children}</Text> : children}
    </Pressable>
  );
}

/**
 * Messenger-style tab row: "All N", then each reaction with its count, and "More" for the ones
 * that don't fit (its list opens right below the row). The active tab is underlined.
 */
function ReactionTabs({
  used,
  counts,
  total,
  value,
  onChange,
}: {
  used: typeof REACTIONS;
  counts: Partial<Record<ReactionType, number>>;
  total: number;
  value: Tab;
  onChange: (t: Tab) => void;
}) {
  const { colors } = useTheme();
  const [more, setMore] = useState(false);
  const split = reactionTabs(
    used.map((r) => r.type),
    MAX_TABS,
    value === 'ALL' ? null : value,
  );
  const visible = split.visible.map((t) => BY_TYPE.get(t)!);
  const overflow = split.overflow.map((t) => BY_TYPE.get(t)!);
  const shown = split.activeInOverflow && value !== 'ALL' ? BY_TYPE.get(value) : undefined;

  return (
    <View>
      <View accessibilityRole="tablist" style={[styles.tabs, { borderBottomColor: colors.line }]}>
        <TabButton on={value === 'ALL'} label={`All ${total}`} onPress={() => onChange('ALL')}>
          {`All ${total}`}
        </TabButton>
        {visible.map((r) => (
          <TabButton key={r.type} on={value === r.type} label={`${counts[r.type]} ${r.label}`} onPress={() => onChange(r.type)}>
            <View style={styles.tabInner}>
              <Icon name={r.icon} size={18} color={r.color} />
              <Text style={[styles.tabText, { color: colors.text }, value === r.type && styles.tabOn]}>{counts[r.type]}</Text>
            </View>
          </TabButton>
        ))}
        {overflow.length > 0 ? (
          <TabButton on={split.activeInOverflow} label={shown ? `${counts[shown.type]} ${shown.label}. More reactions` : 'More reactions'} onPress={() => setMore(!more)}>
            <View style={styles.tabInner}>
              {shown ? (
                <>
                  <Icon name={shown.icon} size={18} color={shown.color} />
                  <Text style={[styles.tabText, { color: colors.text }, styles.tabOn]}>{counts[shown.type]}</Text>
                </>
              ) : (
                <Text style={[styles.tabText, { color: colors.text }]}>More</Text>
              )}
              <Icon name={more ? 'chevu' : 'chevd'} size={14} color={colors.text} />
            </View>
          </TabButton>
        ) : null}
      </View>
      {more ? (
        <View style={[styles.more, { backgroundColor: colors.surface, borderColor: colors.line }]} accessibilityLabel="More reactions">
          {overflow.map((r) => (
            <Pressable
              key={r.type}
              accessibilityRole="button"
              accessibilityLabel={`${counts[r.type]} ${r.label}`}
              onPress={() => {
                onChange(r.type);
                setMore(false);
              }}
              style={[styles.moreRow, value === r.type && { backgroundColor: colors.surface2 }]}>
              <Icon name={r.icon} size={20} color={r.color} />
              <Text style={[styles.name, styles.flex, { color: colors.text }]}>{r.label}</Text>
              <Text style={[styles.name, { color: colors.text }]}>{counts[r.type]}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 2 },
  tab: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, marginBottom: -2, borderBottomWidth: 3 },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabText: { fontFamily: font.bodyBold, fontSize: 15 },
  tabOn: { fontFamily: font.bodyHeavy, color: brand.tealDark },
  more: { borderWidth: 3, borderRadius: 18, padding: 4, marginTop: 6 },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 4 },
  mine: { borderRadius: 14 },
  name: { fontFamily: font.bodyHeavy, fontSize: 15 },
  sub: { fontFamily: font.bodyBold, fontSize: 12, opacity: 0.7 },
});
