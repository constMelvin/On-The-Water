import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import type { ChatMessageVM, ReactionType } from '@/lib/api/types';
import { SWIPE_LOCK_PX, SWIPE_REPLY_PX, swipeTriggersReply } from '@/lib/otw/chat-swipe';
import { driveThumb } from '@/lib/otw/drive';
import { useGala } from '@/lib/otw/gala-store';
import { EVERYONE, splitMentions } from '@/lib/otw/mentions';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { galaHref } from '../nav';
import { BY_TYPE, REACTIONS } from './reactions';

/** Hold this long (ms) to open a message's actions. */
const LONG_PRESS_MS = 400;
/** How far (px) a swiped bubble follows the finger. */
const SWIPE_MAX_PX = 80;

export function MessageRow({
  m,
  tm,
  members,
  nameOf,
  myUserId,
  picking,
  setPicking,
  flash,
  onReact,
  onReply,
  onJumpTo,
  onShowReactions,
}: {
  m: ChatMessageVM;
  tm: string;
  members: ReturnType<typeof useGala>['members'];
  nameOf: (id: string | null) => string;
  myUserId: string;
  picking: boolean;
  setPicking: (open: boolean) => void;
  /** Briefly highlighted after a reply quote jumped here. */
  flash: boolean;
  onReact: (id: string, r: ReactionType | null) => void;
  onReply: (m: ChatMessageVM) => void;
  onJumpTo: (id: string) => void;
  onShowReactions: (m: ChatMessageVM) => void;
}) {
  const { colors } = useTheme();
  const { roomId } = useGala();

  if (m.kind === 'SYSTEM') {
    return (
      <View style={styles.msys}>
        <Icon name="sparkle" size={12} color={brand.rosy} />
        <Text style={[styles.msysText, { color: colors.text }]}>{m.body}</Text>
        <Text style={[styles.tm, { color: colors.text }]}>{tm}</Text>
      </View>
    );
  }
  const who = nameOf(m.senderUserId);
  if (m.kind === 'CARD') {
    const seg = m.refType === 'EXPENSE' ? 'ambagan' : 'route';
    return (
      <View style={[styles.mcard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={[styles.icoSm, { backgroundColor: colors.surface2 }]}>
          <Icon name={m.refType === 'EXPENSE' ? 'wallet' : 'route'} size={20} color={brand.rosy} />
        </View>
        <Text style={[styles.mcardText, { color: colors.text }]}>
          {who} {m.body}
        </Text>
        <Text accessibilityRole="link" onPress={() => router.navigate(galaHref(roomId!, seg) as Href)} style={[styles.lnk, { color: colors.text }]}>
          View
        </Text>
      </View>
    );
  }
  const me = m.senderUserId === myUserId;
  const member = members.find((x) => x.id === m.senderUserId);
  const ink = me ? brand.cream : colors.text;
  return (
    <SwipeToReply me={me} onReply={() => onReply(m)} onLongPress={() => setPicking(true)}>
      <View style={[styles.msg, me && styles.msgMe, flash && { backgroundColor: colors.surface2, borderRadius: 20 }]}>
        {!me ? <Avatar name={who} tone={member?.c} size={32} online={member?.on === 1} userId={member?.id} /> : null}
        <View style={[styles.mb, me && { alignItems: 'flex-end' }]}>
          <Text style={[styles.mn, { color: colors.text }]}>
            {me ? 'You' : who} <Text style={styles.tm}>{tm}</Text>
          </Text>
          {picking ? <Picker m={m} onReact={onReact} onReply={() => onReply(m)} close={() => setPicking(false)} /> : null}
          <View style={[styles.bubble, me ? styles.bubbleMe : { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 3 }]}>
            {m.replyTo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Replying to ${nameOf(m.replyTo.senderUserId)}. Show the original message`}
                onPress={() => onJumpTo(m.replyTo!.id)}
                style={[styles.quote, { backgroundColor: colors.surface2, borderLeftColor: me ? brand.zest : brand.teal }]}>
                <Text style={[styles.quoteName, { color: colors.text }]}>
                  {m.replyTo.senderUserId === myUserId ? 'You' : nameOf(m.replyTo.senderUserId)}
                </Text>
                <Text numberOfLines={1} style={[styles.quoteText, { color: colors.text }]}>
                  {m.replyTo.snippet || (m.replyTo.hasPhoto ? 'Photo' : '…')}
                </Text>
              </Pressable>
            ) : null}
            {m.refType === 'PHOTO' ? (
              m.photo ? (
                <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Open ${me ? 'your' : `${who}'s`} photo`} onPress={() => void Linking.openURL(driveThumb(m.photo!.driveFileId, 1600))}>
                  <Image source={{ uri: driveThumb(m.photo.driveFileId, 640) }} style={styles.mphoto} contentFit="cover" />
                </Pressable>
              ) : (
                <Text style={[styles.mgone, { color: ink }]}>Photo removed from the Gala Dump.</Text>
              )
            ) : null}
            {m.body ? <Text style={[styles.body, { color: ink }]}>{body(m, nameOf, myUserId)}</Text> : null}
          </View>
          <ReactionPill m={m} onPress={() => onShowReactions(m)} />
        </View>
      </View>
    </SwipeToReply>
  );
}

/** A body with its @mentions drawn as chips; @me and @everyone stand out more. */
function body(m: ChatMessageVM, nameOf: (id: string | null) => string, myUserId: string): ReactNode {
  const labels = (m.mentions ?? []).map((id) => ({ label: nameOf(id), mine: id === myUserId }));
  if (m.mentionsEveryone) labels.push({ label: EVERYONE, mine: true });
  if (!labels.length) return m.body;
  return splitMentions(m.body, labels).map((seg, i) =>
    seg.mention ? (
      <Text key={i} style={seg.mention.mine ? styles.mentionMe : styles.mention}>
        {seg.text}
      </Text>
    ) : (
      seg.text
    ),
  );
}

/**
 * Hold to open the actions; swipe toward the middle (right for others, left for mine) to reply.
 * A mostly vertical drag fails the pan, so the chat still scrolls.
 */
function SwipeToReply({ me, onReply, onLongPress, children }: { me: boolean; onReply: () => void; onLongPress: () => void; children: ReactNode }) {
  const { colors } = useTheme();
  const dir = me ? -1 : 1;
  const tx = useSharedValue(0);
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-SWIPE_LOCK_PX, SWIPE_LOCK_PX])
    .failOffsetY([-SWIPE_LOCK_PX, SWIPE_LOCK_PX])
    .onUpdate((e) => {
      tx.value = dir * Math.min(SWIPE_MAX_PX, Math.max(0, e.translationX * dir));
    })
    .onEnd((e) => {
      if (swipeTriggersReply(e.translationX, dir)) onReply();
    })
    .onFinalize(() => {
      tx.value = withSpring(0);
    });
  const hold = Gesture.LongPress().runOnJS(true).minDuration(LONG_PRESS_MS).onStart(onLongPress);
  const bubble = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const hint = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(tx.value) / SWIPE_REPLY_PX) }));

  return (
    <GestureDetector gesture={Gesture.Race(pan, hold)}>
      <View>
        <Animated.View style={[styles.hint, me ? { right: 0 } : { left: 0 }, hint]} pointerEvents="none">
          <Icon name="reply" size={18} color={colors.text} />
        </Animated.View>
        <Animated.View style={bubble}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

/** The reaction picker plus Reply, opened by holding a message. */
function Picker({ m, onReact, onReply, close }: { m: ChatMessageVM; onReact: (id: string, r: ReactionType | null) => void; onReply: () => void; close: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.line }]} accessibilityLabel="Message actions">
      {REACTIONS.map((r) => {
        const on = m.myReaction === r.type;
        return (
          <Pressable
            key={r.type}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={on ? `Remove ${r.label}` : r.label}
            onPress={() => {
              onReact(m.id, on ? null : r.type);
              close();
            }}
            style={[styles.pick, on && { backgroundColor: colors.surface2 }]}>
            <Icon name={r.icon} size={22} color={r.color} />
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reply"
        onPress={() => {
          onReply();
          close();
        }}
        style={[styles.pick, { backgroundColor: colors.surface2 }]}>
        <Icon name="reply" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

/** Used reactions + total under a bubble; opens who reacted. Hidden until someone reacts. */
function ReactionPill({ m, onPress }: { m: ChatMessageVM; onPress: () => void }) {
  const { colors } = useTheme();
  const used = REACTIONS.filter((r) => (m.reactions?.[r.type] ?? 0) > 0);
  const total = used.reduce((n, r) => n + (m.reactions?.[r.type] ?? 0), 0);
  if (!total) return null;
  const mine = m.myReaction ? BY_TYPE.get(m.myReaction) : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reactions: ${used.map((r) => `${m.reactions[r.type]} ${r.label}`).join(', ')}. ${mine ? `Yours: ${mine.label}. ` : ''}See who reacted`}
      onPress={onPress}
      style={[styles.react, { backgroundColor: colors.surface, borderColor: m.myReaction ? brand.rosy : colors.line }]}>
      {used.slice(0, 3).map((r) => (
        <Icon key={r.type} name={r.icon} size={14} color={r.color} />
      ))}
      {total > 1 ? <Text style={[styles.rcount, { color: colors.text }]}>{total}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  msys: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', paddingVertical: 2 },
  msysText: { fontFamily: font.bodyBold, fontSize: 13, opacity: 0.85, textAlign: 'center' },
  tm: { fontFamily: font.body, fontSize: 11, opacity: 0.6 },
  mcard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 3, borderRadius: 20, padding: 10 },
  icoSm: { width: 38, height: 38, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mcardText: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 14 },
  lnk: { fontFamily: font.bodyHeavy, fontSize: 14, textDecorationLine: 'underline' },
  hint: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  msg: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', maxWidth: '88%' },
  msgMe: { alignSelf: 'flex-end' },
  mb: { gap: 3, flexShrink: 1 },
  mn: { fontFamily: font.bodyHeavy, fontSize: 12 },
  bubble: { borderRadius: 20, paddingVertical: 9, paddingHorizontal: 13, gap: 6 },
  bubbleMe: { backgroundColor: brand.teal, borderBottomRightRadius: 6 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 22 },
  mention: { fontFamily: font.bodyHeavy, textDecorationLine: 'underline' },
  mentionMe: { fontFamily: font.bodyHeavy, backgroundColor: brand.zest, color: brand.tealDark },
  quote: { borderLeftWidth: 4, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 8, gap: 1 },
  quoteName: { fontFamily: font.bodyHeavy, fontSize: 12 },
  quoteText: { fontFamily: font.bodyBold, fontSize: 13, opacity: 0.8 },
  mphoto: { width: 220, height: 220, borderRadius: 14 },
  mgone: { fontFamily: font.bodyBold, fontSize: 13, fontStyle: 'italic' },
  picker: { flexDirection: 'row', borderWidth: 3, borderRadius: 999, padding: 4, gap: 2, marginBottom: 4 },
  pick: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  react: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 2, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, alignSelf: 'flex-start' },
  rcount: { fontFamily: font.bodyHeavy, fontSize: 12 },
});
