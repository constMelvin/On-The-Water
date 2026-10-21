'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Avatar, Button, Icon, Sheet } from '@/components/otw';
import type { Member } from '@/lib/otw/data';
import { reactorsKey } from '@/lib/otw/live';
import { reactionTabs } from '@/lib/otw/reaction-tabs';
import { getChatReactors } from '@/lib/api/gala';
import type { ChatMessageVM, ReactionType } from '@/lib/api/types';
import { BY_TYPE, REACTIONS } from './MessageList';
import s from './chat.module.css';

type Tab = ReactionType | 'ALL';

/** All + this many reactions fit the sheet's tab row; any more go under "More". */
const MAX_TABS = 5;

/**
 * "Who reacted" for one message: a tab per reaction (with counts from the message) and a paged
 * list of members. My own row comes first and removes my reaction when tapped. chat.* realtime
 * events refresh the list, since its key sits under the chat key.
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
      <ul className={s.reactors}>
        {mine && (
          <li>
            <button type="button" className={s.reactorme} onClick={() => onReact(message.id, null)}>
              <Avatar name={nameOf(myUserId)} tone={toneOf(myUserId)} size={36} userId={myUserId} />
              <span>
                <b>You</b>
                <i>Tap to remove</i>
              </span>
              <span className={`${s.rdot} ${s[mine.tone]}`} aria-label={mine.label}>
                <Icon name={mine.icon} size={14} />
              </span>
            </button>
          </li>
        )}
        {others.map((r) => {
          const look = BY_TYPE.get(r.reaction)!;
          const name = nameOf(r.userId);
          return (
            <li key={r.userId}>
              <Avatar name={name} tone={toneOf(r.userId)} size={36} userId={r.userId} />
              <span>
                <b>{name}</b>
              </span>
              <span className={`${s.rdot} ${s[look.tone]}`} aria-label={look.label}>
                <Icon name={look.icon} size={14} />
              </span>
            </li>
          );
        })}
      </ul>
      {q.isPending && <p className={s.reactorsnote}>Loading…</p>}
      {q.isError && <p className={s.reactorsnote}>Couldn&apos;t load who reacted.</p>}
      {q.hasNextPage && (
        <Button variant="ghost" sm disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
          {q.isFetchingNextPage ? 'Loading…' : 'Show more'}
        </Button>
      )}
    </Sheet>
  );
}

/**
 * Messenger-style tab row: "All N", then each reaction with its count, and "More" for the ones
 * that don't fit. The active tab is underlined. Left/Right move between tabs.
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
  const [more, setMore] = useState(false);
  const split = reactionTabs(
    used.map((r) => r.type),
    MAX_TABS,
    value === 'ALL' ? null : value,
  );
  const visible = split.visible.map((t) => BY_TYPE.get(t)!);
  const overflow = split.overflow.map((t) => BY_TYPE.get(t)!);
  const activeInOverflow = split.activeInOverflow;
  const shown = activeInOverflow && value !== 'ALL' ? BY_TYPE.get(value) : undefined;

  // The open More list closes on Escape (before the sheet does) and on a click anywhere else.
  useEffect(() => {
    if (!more) return;
    const close = () => setMore(false);
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close();
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [more]);

  const onKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    const at = tabs.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    e.preventDefault();
    tabs[(at + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].focus();
  };

  return (
    <div className={s.rtabs} role="tablist" aria-label="Filter reactions" onKeyDown={onKeys}>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'ALL'}
        tabIndex={value === 'ALL' ? 0 : -1}
        className={`${s.rtab}${value === 'ALL' ? ` ${s.on}` : ''}`}
        onClick={() => onChange('ALL')}
      >
        All {total}
      </button>
      {visible.map((r) => (
        <button
          key={r.type}
          type="button"
          role="tab"
          aria-selected={value === r.type}
          aria-label={`${counts[r.type]} ${r.label}`}
          tabIndex={value === r.type ? 0 : -1}
          className={`${s.rtab}${value === r.type ? ` ${s.on}` : ''}`}
          onClick={() => onChange(r.type)}
        >
          <span className={`${s.rdot} ${s[r.tone]}`}>
            <Icon name={r.icon} size={13} />
          </span>
          {counts[r.type]}
        </button>
      ))}
      {overflow.length > 0 && (
        <div className={s.rmorewrap} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            role="tab"
            aria-selected={activeInOverflow}
            aria-haspopup="menu"
            aria-expanded={more}
            tabIndex={activeInOverflow ? 0 : -1}
            className={`${s.rtab}${activeInOverflow ? ` ${s.on}` : ''}`}
            onClick={() => setMore(!more)}
          >
            {shown ? (
              <>
                <span className={`${s.rdot} ${s[shown.tone]}`}>
                  <Icon name={shown.icon} size={13} />
                </span>
                {counts[shown.type]}
              </>
            ) : (
              'More'
            )}
            <Icon name="chevd" size={14} />
          </button>
          {more && (
            <ul className={s.rmore} role="menu" aria-label="More reactions">
              {overflow.map((r) => (
                <li key={r.type} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={value === r.type ? s.on : undefined}
                    onClick={() => {
                      onChange(r.type);
                      setMore(false);
                    }}
                  >
                    <span className={`${s.rdot} ${s[r.tone]}`}>
                      <Icon name={r.icon} size={13} />
                    </span>
                    {r.label}
                    <b>{counts[r.type]}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
