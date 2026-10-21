'use client';

/**
 * Chismis (group chat) tab. Reference: src/proto2.js views.chat, chat-*.png.
 * Data is GET /rooms/{roomId}/chat/messages (newest first, 30 a page; "Load earlier" pages back).
 * Sending (text, or a photo that also lands in the Gala Dump), reactions and system / card lines (written by the server, e.g. "Sam changed their status
 * to I'm G.") arrive for everyone over realtime chat.* on room:{roomId}.
 * A message can reply to an earlier one (quote above the bubble; clicking it jumps there) and
 * @mention members or @everyone (they get a notification on the mobile app). Tapping a reaction
 * pill opens who reacted.
 *
 * Unread: GET .../chat/unread when the tab opens freezes where the "N new" divider goes for this
 * visit; then PUT .../chat/read marks everything read, which also clears the nav badge
 * (/summary's unreadChat). Anything that lands while the tab is open is marked read too.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Button } from '@/components/otw';
import { useGala } from '@/lib/otw/gala-store';
import { toast } from '@/lib/otw/feedback';
import { featureKey } from '@/lib/otw/live';
import { useTabState } from '@/lib/otw/gala-queries';
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
import { uploadToDrive } from '@/lib/otw/drive';
import { StateGate } from '../States';
import { PinnedPlan } from './PinnedPlan';
import { MessageList } from './MessageList';
import { Composer, type SendMentions } from './Composer';
import { ReactionsSheet } from './ReactionsSheet';
import { ChatSide } from './ChatSide';
import s from './chat.module.css';

/** How close to the bottom (px) still counts as "reading the newest", so new messages keep it pinned. */
const STICK_PX = 80;

type ChatPages = InfiniteData<Page<ChatMessageVM>, string | null>;

/** Applies `fn` to the message with this id, wherever it is in the loaded pages. */
const patchMessage = (data: ChatPages | undefined, id: string, fn: (m: ChatMessageVM) => ChatMessageVM) =>
  data && {
    ...data,
    pages: data.pages.map((p) => ({ ...p, items: p.items.map((m) => (m.id === id ? fn(m) : m)) })),
  };

/** Chat's poll interval while realtime is down (only while this tab is open and visible). */
const CHAT_POLL_MS = 3_000;

/** How long (ms) a message a reply quote jumped to stays highlighted. */
const FLASH_MS = 1_500;
/** Most older pages (30 messages each) loaded while looking for a quoted message. */
const MAX_JUMP_PAGES = 20;

export function Chat({ code }: { code: string }) {
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
    // Realtime down: poll faster than other tabs, since a chat that lags 15 s feels broken.
    refetchInterval: live ? false : CHAT_POLL_MS,
  });
  const state = useTabState(q);

  // Pages are newest first; the log reads oldest to newest. Deduped in case a message moved pages.
  const messages = useMemo(() => {
    const seen = new Set<string>();
    const out: ChatMessageVM[] = [];
    for (const m of (q.data?.pages ?? []).flatMap((p) => p.items)) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out.reverse();
  }, [q.data]);

  // Where "N new" starts is read once when the tab opens, so the divider stays put during this
  // visit even though everything gets marked read right away. The ref keeps Strict Mode's second
  // effect run from re-reading after the mark-read.
  const [divider, setDivider] = useState<UnreadVM | null>(null);
  const snappedFor = useRef<string | null>(null);
  const summaryKey = featureKey(roomId, 'summary');
  const readAll = useCallback(() => {
    if (!roomId) return;
    markChatRead(roomId)
      .then(() => qc.invalidateQueries({ queryKey: summaryKey }))
      .catch(() => undefined); // the badge just stays until the next visit
    // summaryKey is derived from roomId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, qc]);
  useEffect(() => {
    if (!roomId || snappedFor.current === roomId) return;
    snappedFor.current = roomId;
    getChatUnread(roomId)
      .then(setDivider)
      .catch(() => setDivider(null))
      .finally(readAll);
  }, [roomId, readAll]);
  // Anything that arrives while the tab is open is read too (it just doesn't move the divider).
  const newestId = messages[messages.length - 1]?.id;
  const firstNewest = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!newestId) return;
    if (firstNewest.current === undefined) {
      firstNewest.current = newestId; // the open-time read above covers this one
      return;
    }
    if (firstNewest.current !== newestId) readAll();
  }, [newestId, readAll]);

  // Autoscroll: to the newest on load, after I send, and when a message lands while I'm already
  // at the bottom. If I've scrolled up to read, others' messages don't yank me down.
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atBottom = useRef(true);
  const forceScroll = useRef(false);
  useLayoutEffect(() => {
    const el = logRef.current;
    if (!el || !(atBottom.current || forceScroll.current)) return;
    el.scrollTop = el.scrollHeight;
    forceScroll.current = false;
  }, [newestId, state]);

  /** Puts a message I just sent at the bottom (realtime may have delivered it already). */
  const addMine = useCallback(
    (msg: ChatMessageVM) =>
      qc.setQueryData<ChatPages>(key, (data) => {
        if (!data?.pages.length || data.pages.some((p) => p.items.some((m) => m.id === msg.id))) return data;
        const [first, ...rest] = data.pages;
        return { ...data, pages: [{ ...first, items: [msg, ...first.items] }, ...rest] };
      }),
    // key is derived from roomId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId, qc]
  );
  const sendFailed = (e: unknown, fallback: string) =>
    toast(e instanceof Error && e.message ? e.message : fallback, 'err');

  // The message the composer is replying to; cleared once a message is sent.
  const [replyTo, setReplyTo] = useState<ChatMessageVM | null>(null);
  const extras = (mentions?: SendMentions): SendChatOptions => ({
    replyToMessageId: replyTo?.id,
    mentionedUserIds: mentions?.ids.length ? mentions.ids : undefined,
    mentionEveryone: mentions?.everyone || undefined,
  });

  const onSend = (text: string, mentions: SendMentions) => {
    const body = text.trim();
    if (!body || !roomId) return false;
    forceScroll.current = true;
    sendChat(roomId, body, extras(mentions))
      .then(addMine)
      .catch((e: unknown) => sendFailed(e, "Your message didn't send. Try again."));
    setReplyTo(null);
    return true;
  };

  /** Photo: upload to the gala's Drive folder, register it in the Dump, then post it in the chat. */
  const onSendPhoto = async (file: File, caption: string, mentions?: SendMentions) => {
    if (!roomId) return false;
    try {
      const driveFileId = await uploadToDrive(file, (f) => startPhotoUpload(roomId, f).then((r) => r.uploadUrl));
      const photo = await registerPhoto(roomId, driveFileId, caption.trim() || null);
      forceScroll.current = true;
      addMine(await sendChat(roomId, caption.trim(), { photoId: photo.id, ...extras(mentions) }));
      setReplyTo(null);
      return true;
    } catch (e) {
      sendFailed(e, "Your photo didn't send. Try again.");
      return false;
    }
  };

  /** Sets my reaction (null removes it). Instant locally; the server's counts replace it. */
  const onReact = (id: string, reaction: ReactionType | null) => {
    if (!roomId) return;
    qc.setQueryData<ChatPages>(key, (data) =>
      patchMessage(data, id, (x) => {
        const reactions = { ...x.reactions };
        if (x.myReaction) reactions[x.myReaction] = Math.max(0, (reactions[x.myReaction] ?? 1) - 1);
        if (reaction) reactions[reaction] = (reactions[reaction] ?? 0) + 1;
        return { ...x, reactions, myReaction: reaction };
      })
    );
    setReaction(roomId, id, reaction)
      .then((saved) => qc.setQueryData<ChatPages>(key, (data) => patchMessage(data, id, (x) => ({ ...saved, photo: x.photo }))))
      .catch(() => {
        toast("Couldn't react to that message.", 'err');
        void qc.invalidateQueries({ queryKey: key });
      });
  };

  // Jumping to the message a reply quotes: older pages load until it shows up (or history ends).
  const { hasNextPage, fetchNextPage } = q;
  const onJumpTo = async (id: string) => {
    const find = () => logRef.current?.querySelector<HTMLElement>(`[data-msg-id="${CSS.escape(id)}"]`);
    let more = hasNextPage;
    for (let page = 0; !find() && more && page < MAX_JUMP_PAGES; page++) {
      more = (await fetchNextPage()).hasNextPage;
      // Let React render the page that just arrived.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    const el = find();
    if (!el) {
      toast("Couldn't find that message.", 'err');
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add(s.flash);
    window.setTimeout(() => el.classList.remove(s.flash), FLASH_MS);
  };

  // "Who reacted" follows the live message, so its tab counts update with reactions.
  const [reactionsFor, setReactionsFor] = useState<string | null>(null);
  const reactionsMsg = reactionsFor ? messages.find((m) => m.id === reactionsFor) : undefined;
  const closeReactions = useCallback(() => setReactionsFor(null), []);

  const mentionable = useMemo(
    () => members.filter((m) => m.id && m.id !== myUserId).map((m) => ({ userId: m.id!, label: m.n, tone: m.c })),
    [members, myUserId]
  );

  const stops = summary?.itineraryStops ?? 0;

  return (
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
      }}
    >
      <div className={s.chatwrap}>
        <div className={s.chatcol}>
          <PinnedPlan stops={stops} perPerson={summary?.budgetPerPerson ?? 0} />
          <div
            ref={logRef}
            className={s.chatlog}
            role="log"
            aria-label="Chismis"
            onScroll={(e) => {
              const el = e.currentTarget;
              atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
            }}
          >
            {q.hasNextPage && (
              <Button
                variant="ghost"
                sm
                disabled={q.isFetchingNextPage}
                onClick={() => void q.fetchNextPage()}
                style={{ alignSelf: 'center' }}
              >
                {q.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
              </Button>
            )}
            <MessageList
              code={code}
              messages={messages}
              members={members}
              nameOf={nameOf}
              myUserId={myUserId ?? ''}
              firstUnreadId={divider?.count ? divider.firstUnreadId : null}
              unreadCount={divider?.count ?? 0}
              onReact={onReact}
              onReply={setReplyTo}
              onJumpTo={(id) => void onJumpTo(id)}
              onShowReactions={(m) => setReactionsFor(m.id)}
            />
          </div>
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
          {reactionsMsg && roomId && (
            <ReactionsSheet
              roomId={roomId}
              message={reactionsMsg}
              members={members}
              nameOf={nameOf}
              myUserId={myUserId ?? ''}
              onReact={onReact}
              onClose={closeReactions}
            />
          )}
        </div>
        <ChatSide stops={stops} />
      </div>
    </StateGate>
  );
}
