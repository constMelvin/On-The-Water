'use client';

/**
 * Chismis (group chat) tab. Reference: src/proto2.js views.chat, chat-*.png.
 * Data is the mock chat slice (lib/otw/mock/chat.ts): sending appends to it right away and
 * other tabs of the same browser stay in sync.
 * TODO(backend): chat endpoints (GET .../chat/messages paginated, POST to send, reactions, read
 * cursor) and realtime chat.* events on room:{roomId}, applied after the server commits.
 *
 * Unread: the "N new" divider is computed here only, from the slice's lastReadAt. The nav
 * badge is NOT driven by this; it reads gala-store.unread (GET /summary).
 * TODO(backend): once the read cursor is a real endpoint, /summary's unread (the nav badge) and
 * this divider come from the same place; until then opening the chat doesn't clear the badge.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGala } from '@/lib/otw/gala-store';
import { budget, itinerary, mockUserId, useSlice } from '@/lib/otw/mock';
import { chat, markRead, sendMessage, toggleHeart, unreadAfter } from '@/lib/otw/mock/chat';
import { StateGate } from '../States';
import { PinnedPlan } from './PinnedPlan';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { ChatSide } from './ChatSide';
import s from './chat.module.css';

/** How close to the bottom (px) still counts as "reading the newest", so new messages keep it pinned. */
const STICK_PX = 80;

export function Chat({ code }: { code: string }) {
  const { members, me, viewState, liveState, setViewState, retry } = useGala();
  // Same rule as the dashboard: the dev switcher wins, otherwise the live query state.
  const state = viewState !== 'default' ? viewState : liveState;

  const [{ messages }] = useSlice(chat, code);
  const [stops] = useSlice(itinerary, code);
  const [bud] = useSlice(budget, code);
  const myUserId = mockUserId(me);

  // Where "N new" starts is frozen when the tab opens, so the divider stays put during this visit
  // even though everything gets marked read right away. Read after mount: the first render uses
  // the server snapshot, not what this browser stored.
  // The ref keeps Strict Mode's second effect run from re-snapshotting after markRead.
  const [readAt, setReadAt] = useState<string | null | undefined>(undefined);
  const snappedFor = useRef<string | null>(null);
  useEffect(() => {
    if (snappedFor.current === code) return;
    snappedFor.current = code;
    setReadAt(chat.get(code).lastReadAt);
    markRead(code);
  }, [code]);
  // Anything that arrives while the tab is open is read too (it just doesn't move the divider).
  const newestId = messages[messages.length - 1]?.id;
  useEffect(() => {
    if (newestId) markRead(code);
  }, [code, newestId]);

  const unread = useMemo(
    () => (readAt === undefined ? [] : unreadAfter(messages, readAt, myUserId)),
    [messages, readAt, myUserId]
  );

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
  }, [messages.length, state]);

  const onSend = useCallback(
    (text: string) => {
      const sent = sendMessage(code, myUserId, text);
      if (sent) forceScroll.current = true;
      return sent;
    },
    [code, myUserId]
  );

  // Phase 3 (states + polish) is a follow-up; this only routes loading / empty / error / offline.
  return (
    <StateGate
      state={state}
      kind="chat"
      skeleton="chat"
      onAction={() => {
        setViewState('default');
        inputRef.current?.focus();
      }}
      onRetry={() => {
        setViewState('default');
        return retry();
      }}
    >
      <div className={s.chatwrap}>
        <div className={s.chatcol}>
          <PinnedPlan stops={stops.length} perPerson={bud.perPerson} />
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
            <MessageList
              code={code}
              messages={messages}
              members={members}
              myUserId={myUserId}
              firstUnreadId={unread[0]?.id ?? null}
              unreadCount={unread.length}
              onHeart={(id) => toggleHeart(code, id)}
            />
          </div>
          <Composer onSend={onSend} inputRef={inputRef} />
        </div>
        <ChatSide stops={stops.length} />
      </div>
    </StateGate>
  );
}
