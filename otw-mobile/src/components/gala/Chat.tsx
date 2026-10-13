import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Avatar } from '@/components/Avatar';
import { Icon, type IconName } from '@/components/Icon';
import { StateGate } from '@/components/States';
import { Button, IconButton } from '@/components/ui';
import { getChatPage, getChatUnread, markChatRead, registerPhoto, sendChat, setReaction, startPhotoUpload } from '@/lib/api/gala';
import type { Page } from '@/lib/api/rooms';
import type { ChatMessageVM, ReactionType, UnreadVM } from '@/lib/api/types';
import { peso } from '@/lib/otw/data';
import { driveThumb, uploadToDrive, type LocalFile } from '@/lib/otw/drive';
import { toast } from '@/lib/otw/feedback';
import { useTabState } from '@/lib/otw/gala-queries';
import { useGala } from '@/lib/otw/gala-store';
import { kv } from '@/lib/otw/kv';
import { featureKey } from '@/lib/otw/live';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { galaHref } from './nav';

/**
 * Chismis (port of otw-client/src/components/gala/chat/*). GET .../chat/messages (newest first, 30 a page,
 * "Load earlier" pages back); text, photos (also land in the Gala Dump), reactions, system / card lines.
 * Unread: GET .../chat/unread when the tab opens freezes where "N new" goes; PUT .../chat/read clears the badge.
 */
type ChatPages = InfiniteData<Page<ChatMessageVM>, string | null>;
const CHAT_POLL_MS = 3_000;
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

export const REACTIONS: { type: ReactionType; icon: IconName; label: string; color: string }[] = [
  { type: 'HEART', icon: 'heart', label: 'Heart', color: brand.rosy },
  { type: 'HAHA', icon: 'haha', label: 'Haha', color: brand.zestDark },
  { type: 'WOW', icon: 'wow', label: 'Wow', color: brand.teal },
  { type: 'SAD', icon: 'sad', label: 'Sad', color: brand.tealDark },
  { type: 'ANGRY', icon: 'angry', label: 'Angry', color: brand.rosyDark },
  { type: 'LIKE', icon: 'like', label: 'Like', color: brand.teal },
];

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

  // Newest first (the inverted list draws it at the bottom). Deduped in case a message moved pages.
  const messages = useMemo(() => {
    const seen = new Set<string>();
    const out: ChatMessageVM[] = [];
    for (const m of (q.data?.pages ?? []).flatMap((p) => p.items)) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }, [q.data]);

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

  const onSend = (text: string) => {
    const body = text.trim();
    if (!body || !roomId) return false;
    sendChat(roomId, body)
      .then(addMine)
      .catch((e: unknown) => sendFailed(e, "Your message didn't send. Try again."));
    return true;
  };

  const onSendPhoto = async (file: LocalFile, caption: string) => {
    if (!roomId) return false;
    try {
      const driveFileId = await uploadToDrive(file, (f) => startPhotoUpload(roomId, f).then((r) => r.uploadUrl));
      const photo = await registerPhoto(roomId, driveFileId, caption.trim() || null);
      addMine(await sendChat(roomId, caption.trim(), photo.id));
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
            inverted
            style={styles.flex}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.log}
            keyboardShouldPersistTaps="handled"
            accessibilityLabel="Chismis"
            onScrollBeginDrag={() => setPicking(null)}
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
                  onReact={onReact}
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
          <Composer onSend={onSend} onSendPhoto={onSendPhoto} canAddPhotos={canAddPhotos} inputRef={inputRef} />
        </StateGate>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageRow({
  m,
  tm,
  members,
  nameOf,
  myUserId,
  picking,
  setPicking,
  onReact,
}: {
  m: ChatMessageVM;
  tm: string;
  members: ReturnType<typeof useGala>['members'];
  nameOf: (id: string | null) => string;
  myUserId: string;
  picking: boolean;
  setPicking: (open: boolean) => void;
  onReact: (id: string, r: ReactionType | null) => void;
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
  return (
    <View style={[styles.msg, me && styles.msgMe]}>
      {!me ? <Avatar name={who} tone={member?.c} size={32} online={member?.on === 1} userId={member?.id} /> : null}
      <View style={[styles.mb, me && { alignItems: 'flex-end' }]}>
        <Text style={[styles.mn, { color: colors.text }]}>
          {me ? 'You' : who} <Text style={styles.tm}>{tm}</Text>
        </Text>
        <View style={[styles.bubble, me ? styles.bubbleMe : { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 3 }]}>
          {m.refType === 'PHOTO' ? (
            m.photo ? (
              <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Open ${me ? 'your' : `${who}'s`} photo`} onPress={() => void Linking.openURL(driveThumb(m.photo!.driveFileId, 1600))}>
                <Image source={{ uri: driveThumb(m.photo.driveFileId, 640) }} style={styles.mphoto} contentFit="cover" />
              </Pressable>
            ) : (
              <Text style={[styles.mgone, { color: me ? brand.cream : colors.text }]}>Photo removed from the Gala Dump.</Text>
            )
          ) : null}
          {m.body ? <Text style={[styles.body, { color: me ? brand.cream : colors.text }]}>{m.body}</Text> : null}
        </View>
        <Reactions m={m} open={picking} setOpen={setPicking} onReact={onReact} />
      </View>
    </View>
  );
}

function Reactions({ m, open, setOpen, onReact }: { m: ChatMessageVM; open: boolean; setOpen: (o: boolean) => void; onReact: (id: string, r: ReactionType | null) => void }) {
  const { colors } = useTheme();
  const used = REACTIONS.filter((r) => (m.reactions?.[r.type] ?? 0) > 0);
  const total = used.reduce((n, r) => n + (m.reactions?.[r.type] ?? 0), 0);
  return (
    <View style={styles.reactwrap}>
      {open ? (
        <View style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.line }]} accessibilityLabel="Pick a reaction">
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
                  setOpen(false);
                }}
                style={[styles.pick, on && { backgroundColor: colors.surface2 }]}>
                <Icon name={r.icon} size={22} color={r.color} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={total ? `Reactions: ${used.map((r) => `${m.reactions[r.type]} ${r.label}`).join(', ')}. Change` : 'Add a reaction'}
        onPress={() => setOpen(!open)}
        style={[styles.react, { backgroundColor: colors.surface, borderColor: m.myReaction ? brand.rosy : colors.line }]}>
        {total ? (
          <>
            {used.slice(0, 3).map((r) => (
              <Icon key={r.type} name={r.icon} size={14} color={r.color} />
            ))}
            {total > 1 ? <Text style={[styles.rcount, { color: colors.text }]}>{total}</Text> : null}
          </>
        ) : (
          <Icon name="react" size={16} color={colors.text} />
        )}
      </Pressable>
    </View>
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

function Composer({
  onSend,
  onSendPhoto,
  canAddPhotos,
  inputRef,
}: {
  onSend: (text: string) => boolean;
  onSendPhoto: (file: LocalFile, caption: string) => Promise<boolean>;
  canAddPhotos: boolean;
  inputRef: React.RefObject<TextInput | null>;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<LocalFile | null>(null);
  const [sending, setSending] = useState(false);

  const pick = async (camera: boolean) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return toast('Allow the camera for OTW in your phone settings.', 'err');
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const a = res.canceled ? null : res.assets[0];
    if (!a) return;
    setPhoto({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', fileName: a.fileName });
    inputRef.current?.focus();
  };

  const send = async () => {
    if (sending) return;
    if (photo) {
      setSending(true);
      const ok = await onSendPhoto(photo, draft);
      setSending(false);
      if (ok) {
        setPhoto(null);
        setDraft('');
      }
    } else if (onSend(draft)) {
      setDraft('');
    }
  };

  return (
    <View style={styles.composerWrap}>
      {photo ? (
        <View style={[styles.attach, { backgroundColor: colors.surface2 }]}>
          <Image source={{ uri: photo.uri }} style={styles.attachImg} />
          <Text style={[styles.attachText, { color: colors.text }]}>{sending ? 'Sending to the chat and the Gala Dump…' : 'Goes to the chat and the Gala Dump.'}</Text>
          {!sending ? <IconButton icon="x" size={18} label="Remove photo" onPress={() => setPhoto(null)} /> : null}
        </View>
      ) : null}
      <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        {canAddPhotos ? (
          <>
            <IconButton icon="image" label="Add a photo" onPress={() => void pick(false)} />
            <IconButton icon="camera" label="Take a photo" onPress={() => void pick(true)} />
          </>
        ) : null}
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          editable={!sending}
          maxLength={1000}
          placeholder={photo ? 'Add a caption…' : 'Say something to the gala…'}
          placeholderTextColor={colors.text + '80'}
          accessibilityLabel={photo ? 'Caption' : 'Message'}
          onSubmitEditing={() => void send()}
          returnKeyType="send"
          blurOnSubmit={false}
          style={[styles.input, { color: colors.text, backgroundColor: colors.fieldBg }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={sending} onPress={() => void send()} style={styles.send}>
          <Icon name="send" size={18} color={brand.cream} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  log: { gap: 10, paddingVertical: 8 },
  earlier: { alignItems: 'center', paddingVertical: 6 },
  msys: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', paddingVertical: 2 },
  msysText: { fontFamily: font.bodyBold, fontSize: 13, opacity: 0.85, textAlign: 'center' },
  tm: { fontFamily: font.body, fontSize: 11, opacity: 0.6 },
  mcard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 3, borderRadius: 20, padding: 10 },
  icoSm: { width: 38, height: 38, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mcardText: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 14 },
  lnk: { fontFamily: font.bodyHeavy, fontSize: 14, textDecorationLine: 'underline' },
  msg: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', maxWidth: '88%' },
  msgMe: { alignSelf: 'flex-end' },
  mb: { gap: 3, flexShrink: 1 },
  mn: { fontFamily: font.bodyHeavy, fontSize: 12 },
  bubble: { borderRadius: 20, paddingVertical: 9, paddingHorizontal: 13, gap: 6 },
  bubbleMe: { backgroundColor: brand.teal, borderBottomRightRadius: 6 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 22 },
  mphoto: { width: 220, height: 220, borderRadius: 14 },
  mgone: { fontFamily: font.bodyBold, fontSize: 13, fontStyle: 'italic' },
  reactwrap: { alignItems: 'flex-start' },
  picker: { flexDirection: 'row', borderWidth: 3, borderRadius: 999, padding: 4, gap: 2, marginBottom: 4 },
  pick: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  react: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 2, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 },
  rcount: { fontFamily: font.bodyHeavy, fontSize: 12 },
  mnew: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  mnewLine: { flex: 1, height: 3, borderRadius: 2 },
  mnewText: { fontFamily: font.bodyHeavy, fontSize: 12, color: brand.rosy },
  pinned: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: brand.zest, borderRadius: 20, paddingVertical: 6, paddingLeft: 10, paddingRight: 4, borderBottomWidth: 4, borderBottomColor: brand.zestDark },
  pinIco: { width: 34, height: 34, borderRadius: 14, backgroundColor: brand.cream, alignItems: 'center', justifyContent: 'center' },
  pinTitle: { fontFamily: font.bodyHeavy, fontSize: 14, color: brand.tealDark },
  pinSub: { fontFamily: font.bodyBold, fontSize: 12, color: brand.tealDark },
  composerWrap: { gap: 6 },
  attach: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 8 },
  attachImg: { width: 48, height: 48, borderRadius: 10 },
  attachText: { flex: 1, fontFamily: font.bodyBold, fontSize: 13 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 3, borderRadius: 999, padding: 4 },
  input: { flex: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, fontFamily: font.bodyBold, fontSize: 16 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: brand.rosy, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: brand.rosyDark },
});
