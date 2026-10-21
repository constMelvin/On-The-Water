import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Icon } from '@/components/Icon';
import { StateGate } from '@/components/States';
import { Button, IconButton } from '@/components/ui';
import {
  getChatPage,
  getChatUnread,
  markChatRead,
  registerPhoto,
  sendChat,
  setReaction,
  startPhotoUpload,
  type SendChatOptions,
} from '@/lib/api/gala';
import type { Page } from '@/lib/api/rooms';
import type { ChatMessageVM, ReactionType, UnreadVM } from '@/lib/api/types';
import { peso } from '@/lib/otw/data';
import { uploadToDrive, type LocalFile } from '@/lib/otw/drive';
import { toast } from '@/lib/otw/feedback';
import { useTabState } from '@/lib/otw/gala-queries';
import { useGala } from '@/lib/otw/gala-store';
import { kv } from '@/lib/otw/kv';
import { featureKey } from '@/lib/otw/live';
import { font } from '@/theme/fonts';
import { brand } from '@/theme/tokens';
import { Composer, type SendMentions } from './chat/Composer';
import { MessageRow } from './chat/MessageRow';
import { ReactionsSheet } from './chat/ReactionsSheet';
import { galaHref } from './nav';

/**
 * Chismis (port of otw-client/src/components/gala/chat/*). GET .../chat/messages (newest first, 30 a page,
 * "Load earlier" pages back); text, photos (also land in the Gala Dump), reactions, system / card lines.
 * Unread: GET .../chat/unread when the tab opens freezes where "N new" goes; PUT .../chat/read clears the badge.
 * Hold a message to react or reply, swipe it toward the middle to reply, @ to mention; tap the
 * reaction pill to see who reacted.
 */
type ChatPages = InfiniteData<Page<ChatMessageVM>, string | null>;
const CHAT_POLL_MS = 3_000;
/** How long (ms) a message a reply quote jumped to stays highlighted. */
const FLASH_MS = 1_500;
/** Most older pages (30 messages each) loaded while looking for a quoted message. */
const MAX_JUMP_PAGES = 20;
const TZ = 'Asia/Manila';
const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
const fmtDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: TZ });

function stamp(at: string, prev: string | undefined): string {
  const d = new Date(at);
  const day = fmtDay.format(d);
  const showDay = !prev || fmtDay.format(new Date(prev)) !== day;
  return showDay ? `${day} · ${fmtTime.format(d)}` : fmtTime.format(d);
}

const patchMessage = (data: ChatPages | undefined, id: string, fn: (m: ChatMessageVM) => ChatMessageVM) =>
  data && { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map((m) => (m.id === id ? fn(m) : m)) })) };

/** Newest first (the inverted list draws it at the bottom). Deduped in case a message moved pages. */
function flatten(data: InfiniteData<Page<ChatMessageVM>, unknown> | undefined): ChatMessageVM[] {
  const seen = new Set<string>();
  const out: ChatMessageVM[] = [];
  for (const m of (data?.pages ?? []).flatMap((p) => p.items)) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      out.push(m);
    }
  }
  return out;
}

export function Chat() {
  const { members, nameOf, roomId, myUserId, live, summary, setViewState, room, role } = useGala();
  const canAddPhotos = role === 'leader' || !!room?.permissions.membersCanAddPhotos;
  const qc = useQueryClient();
  const key = featureKey(roomId, 'chat');
  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => getChatPage(roomId!, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!roomId,
    refetchInterval: live ? false : CHAT_POLL_MS,
  });
  const state = useTabState(q);

  const messages = useMemo(() => flatten(q.data), [q.data]);

  const [divider, setDivider] = useState<UnreadVM | null>(null);
  const snappedFor = useRef<string | null>(null);
  const readAll = useCallback(() => {
    if (!roomId) return;
    markChatRead(roomId)
      .then(() => qc.invalidateQueries({ queryKey: featureKey(roomId, 'summary') }))
      .catch(() => undefined);
  }, [roomId, qc]);

  useEffect(() => {
    if (!roomId || snappedFor.current === roomId) return;
    snappedFor.current = roomId;
    getChatUnread(roomId)
      .then(setDivider)
      .catch(() => setDivider(null))
      .finally(readAll);
  }, [roomId, readAll]);

  const newestId = messages[0]?.id;
  const firstNewest = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!newestId) return;
    if (firstNewest.current === undefined) {
      firstNewest.current = newestId;
      return;
    }
    if (firstNewest.current !== newestId) readAll();
  }, [newestId, readAll]);

  const addMine = useCallback(
    (msg: ChatMessageVM) =>
      qc.setQueryData<ChatPages>(featureKey(roomId, 'chat'), (data) => {
        if (!data?.pages.length || data.pages.some((p) => p.items.some((m) => m.id === msg.id))) return data;
        const [first, ...rest] = data.pages;
        return { ...data, pages: [{ ...first, items: [msg, ...first.items] }, ...rest] };
      }),
    [roomId, qc],
  );
  const sendFailed = (e: unknown, fallback: string) => toast(e instanceof Error && e.message ? e.message : fallback, 'err');

  // The message the composer is replying to; cleared once a message is sent.
  const [replyTo, setReplyTo] = useState<ChatMessageVM | null>(null);
  const extras = (mentions: SendMentions): SendChatOptions => ({
    replyToMessageId: replyTo?.id,
    mentionedUserIds: mentions.ids.length ? mentions.ids : undefined,
    mentionEveryone: mentions.everyone || undefined,
  });

  const onSend = (text: string, mentions: SendMentions) => {
    const body = text.trim();
    if (!body || !roomId) return false;
    sendChat(roomId, body, extras(mentions))
      .then(addMine)
      .catch((e: unknown) => sendFailed(e, "Your message didn't send. Try again."));
    setReplyTo(null);
    return true;
  };

  const onSendPhoto = async (file: LocalFile, caption: string, mentions: SendMentions) => {
    if (!roomId) return false;
    try {
      const driveFileId = await uploadToDrive(file, (f) => startPhotoUpload(roomId, f).then((r) => r.uploadUrl));
      const photo = await registerPhoto(roomId, driveFileId, caption.trim() || null);
      addMine(await sendChat(roomId, caption.trim(), { photoId: photo.id, ...extras(mentions) }));
      setReplyTo(null);
      return true;
    } catch (e) {
      sendFailed(e, "Your photo didn't send. Try again.");
      return false;
    }
  };

  const onReact = (id: string, reaction: ReactionType | null) => {
    if (!roomId) return;
    qc.setQueryData<ChatPages>(key, (data) =>
      patchMessage(data, id, (x) => {
        const reactions = { ...x.reactions };
        if (x.myReaction) reactions[x.myReaction] = Math.max(0, (reactions[x.myReaction] ?? 1) - 1);
        if (reaction) reactions[reaction] = (reactions[reaction] ?? 0) + 1;
        return { ...x, reactions, myReaction: reaction };
      }),
    );
    setReaction(roomId, id, reaction)
      .then((saved) => qc.setQueryData<ChatPages>(key, (data) => patchMessage(data, id, (x) => ({ ...saved, photo: x.photo }))))
      .catch(() => {
        toast("Couldn't react to that message.", 'err');
        void qc.invalidateQueries({ queryKey: key });
      });
  };

  const [picking, setPicking] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const firstUnreadId = divider?.count ? divider.firstUnreadId : null;

  // Jumping to the message a reply quotes: older pages load until it shows up (or history ends).
  const listRef = useRef<FlatList<ChatMessageVM>>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const { hasNextPage, fetchNextPage } = q;
  const onJumpTo = async (id: string) => {
    let list = messages;
    let more = hasNextPage;
    for (let page = 0; !list.some((m) => m.id === id) && more && page < MAX_JUMP_PAGES; page++) {
      const r = await fetchNextPage();
      list = flatten(r.data);
      more = r.hasNextPage;
    }
    const index = list.findIndex((m) => m.id === id);
    if (index < 0) {
      toast("Couldn't find that message.", 'err');
      return;
    }
    // Wait a frame so the list has the pages that just arrived.
    requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }));
    setFlashId(id);
    setTimeout(() => setFlashId((f) => (f === id ? null : f)), FLASH_MS);
  };

  // "Who reacted" follows the live message, so its tab counts update with reactions.
  const [reactionsFor, setReactionsFor] = useState<string | null>(null);
  const reactionsMsg = reactionsFor ? messages.find((m) => m.id === reactionsFor) : undefined;
  const closeReactions = useCallback(() => setReactionsFor(null), []);

  const mentionable = useMemo(
    () => members.filter((m) => m.id && m.id !== myUserId).map((m) => ({ userId: m.id!, label: m.n, tone: m.c })),
    [members, myUserId],
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={[styles.flex, { padding: 12, gap: 10 }]}>
        <StateGate
          state={state}
          kind="chat"
          skeleton="chat"
          onAction={() => {
            setViewState('default');
            inputRef.current?.focus();
          }}
          onRetry={async () => {
            setViewState('default');
            return (await q.refetch()).isSuccess;
          }}>
          <PinnedPlan stops={summary?.itineraryStops ?? 0} perPerson={summary?.budgetPerPerson ?? 0} />
          <FlatList
            ref={listRef}
            inverted
            style={styles.flex}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.log}
            keyboardShouldPersistTaps="handled"
            accessibilityLabel="Chismis"
            onScrollBeginDrag={() => setPicking(null)}
            onScrollToIndexFailed={(info) => {
              // Rows have different heights: get close first, then land on it.
              listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
              setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 }), 100);
            }}
            ListFooterComponent={
              q.hasNextPage ? (
                <View style={styles.earlier}>
                  <Button sm fw={false} variant="ghost" label={q.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'} disabled={q.isFetchingNextPage} onPress={() => void q.fetchNextPage()} />
                </View>
              ) : null
            }
            renderItem={({ item: m, index }) => (
              <>
                <MessageRow
                  m={m}
                  tm={stamp(m.createdAt, messages[index + 1]?.createdAt)}
                  members={members}
                  nameOf={nameOf}
                  myUserId={myUserId ?? ''}
                  picking={picking === m.id}
                  setPicking={(o) => setPicking(o ? m.id : null)}
                  flash={flashId === m.id}
                  onReact={onReact}
                  onReply={setReplyTo}
                  onJumpTo={(id) => void onJumpTo(id)}
                  onShowReactions={(x) => setReactionsFor(x.id)}
                />
                {m.id === firstUnreadId ? (
                  <View style={styles.mnew} accessibilityRole="text">
                    <View style={[styles.mnewLine, { backgroundColor: brand.rosy }]} />
                    <Text style={styles.mnewText}>{divider?.count ?? 0} new</Text>
                    <View style={[styles.mnewLine, { backgroundColor: brand.rosy }]} />
                  </View>
                ) : null}
              </>
            )}
          />
          <Composer
            onSend={onSend}
            onSendPhoto={onSendPhoto}
            canAddPhotos={canAddPhotos}
            inputRef={inputRef}
            replyTo={replyTo}
            replyName={replyTo ? (replyTo.senderUserId === myUserId ? 'yourself' : nameOf(replyTo.senderUserId)) : ''}
            onCancelReply={() => setReplyTo(null)}
            mentionable={mentionable}
          />
          {reactionsMsg && roomId ? (
            <ReactionsSheet
              roomId={roomId}
              message={reactionsMsg}
              members={members}
              nameOf={nameOf}
              myUserId={myUserId ?? ''}
              onReact={onReact}
              onClose={closeReactions}
            />
          ) : null}
        </StateGate>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Zest "Locked in" bar at the top of the chat; collapses to one line (remembered on this phone). */
const HIDE_KEY = 'otw:chat-pinned-hidden';
function PinnedPlan({ stops, perPerson }: { stops: number; perPerson: number }) {
  const { gala, roomId } = useGala();
  const [hidden, setHiddenState] = useState(() => kv.getItem(HIDE_KEY) === '1');
  const setHidden = (h: boolean) => {
    setHiddenState(h);
    kv.setItem(HIDE_KEY, h ? '1' : '0');
  };
  const where = [gala.dest, `${stops} ${stops === 1 ? 'stop' : 'stops'}`, `${peso(perPerson)} each`].filter(Boolean);
  return (
    <View style={styles.pinned}>
      {!hidden ? (
        <View style={styles.pinIco}>
          <Icon name="flag" size={18} color={brand.rosy} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <Text style={styles.pinTitle}>Locked in: {gala.range || 'date TBD'}</Text>
        {!hidden ? <Text style={styles.pinSub}>{where.join(' · ')}</Text> : null}
      </View>
      {!hidden ? (
        <Text accessibilityRole="link" onPress={() => router.navigate(galaHref(roomId!, 'route') as Href)} style={[styles.lnk, { color: brand.tealDark }]}>
          View plan
        </Text>
      ) : null}
      <IconButton icon={hidden ? 'chevd' : 'chevu'} color={brand.tealDark} label={hidden ? 'Show plan details' : 'Hide plan details'} onPress={() => setHidden(!hidden)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  log: { gap: 10, paddingVertical: 8 },
  earlier: { alignItems: 'center', paddingVertical: 6 },
  lnk: { fontFamily: font.bodyHeavy, fontSize: 14, textDecorationLine: 'underline' },
  mnew: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  mnewLine: { flex: 1, height: 3, borderRadius: 2 },
  mnewText: { fontFamily: font.bodyHeavy, fontSize: 12, color: brand.rosy },
  pinned: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: brand.zest, borderRadius: 20, paddingVertical: 6, paddingLeft: 10, paddingRight: 4, borderBottomWidth: 4, borderBottomColor: brand.zestDark },
  pinIco: { width: 34, height: 34, borderRadius: 14, backgroundColor: brand.cream, alignItems: 'center', justifyContent: 'center' },
  pinTitle: { fontFamily: font.bodyHeavy, fontSize: 14, color: brand.tealDark },
  pinSub: { fontFamily: font.bodyBold, fontSize: 12, color: brand.tealDark },
});
