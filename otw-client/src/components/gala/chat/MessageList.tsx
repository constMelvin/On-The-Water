'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { Avatar, Icon } from '@/components/otw';
import type { Member } from '@/lib/otw/data';
import type { ChatMessageVM } from '@/lib/api/types';
import { galaHref } from '../nav';
import s from './chat.module.css';

// Times read like the reference ("8:15 PM", "Sep 27 · 8:12 PM"), always in Manila time so
// the server render and the browser agree.
const TZ = 'Asia/Manila';
const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
const fmtDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: TZ });

/** Time label; the date is added on the first message and whenever the day changes. */
function stamp(at: string, prev: string | undefined): string {
  const d = new Date(at);
  const day = fmtDay.format(d);
  const showDay = !prev || fmtDay.format(new Date(prev)) !== day;
  return showDay ? `${day} · ${fmtTime.format(d)}` : fmtTime.format(d);
}

export interface MessageListProps {
  code: string;
  messages: ChatMessageVM[];
  members: Member[];
  nameOf: (userId: string | null) => string;
  myUserId: string;
  /** Id of the first unread message (the divider goes above it), or null for no divider. */
  firstUnreadId: string | null;
  unreadCount: number;
  onHeart: (id: string) => void;
}

/** The chat log body: member / own / system / card messages and the "N new" divider (reference views.chat). */
export function MessageList({ code, messages, members, nameOf, myUserId, firstUnreadId, unreadCount, onHeart }: MessageListProps) {
  const row = (m: ChatMessageVM, tm: string): ReactNode => {
    if (m.kind === 'SYSTEM') {
      return (
        <div className={s.msys}>
          <Icon name="sparkle" size={12} />
          <span>{m.body}</span>
          <i>{tm}</i>
        </div>
      );
    }

    const who = nameOf(m.senderUserId);

    if (m.kind === 'CARD') {
      return (
        <div className={s.mcard}>
          <span className="ico sm">
            <Icon name={m.refType === 'EXPENSE' ? 'wallet' : 'route'} size={20} />
          </span>
          <div>
            <b>
              {who} {m.body}
            </b>
          </div>
          <Link className="lnk" href={galaHref(code, m.refType === 'EXPENSE' ? 'ambagan' : 'route')}>
            View
          </Link>
        </div>
      );
    }

    const me = m.senderUserId === myUserId;
    const member = members.find((x) => x.id === m.senderUserId);
    return (
      <div className={`${s.msg}${me ? ` ${s.me}` : ''}`}>
        {!me && <Avatar name={who} tone={member?.c} size={32} online={member?.on === 1} />}
        {/* Tap the bubble to heart it (pointer); the heart button is the keyboard / screen-reader control. */}
        <div className={s.mb} onClick={() => onHeart(m.id)}>
          <span className={s.mn}>
            {me ? 'You' : who}
            <i>{tm}</i>
          </span>
          <p>{m.body}</p>
          <button
            type="button"
            className={`${s.react}${m.reactedByMe ? ` ${s.on}` : ''}`}
            aria-pressed={m.reactedByMe}
            aria-label={`React with a heart${m.heartCount ? `, ${m.heartCount} so far` : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onHeart(m.id);
            }}
          >
            <Icon name="heart" size={14} />
            {m.heartCount || ''}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {messages.map((m, i) => (
        <Fragment key={m.id}>
          {m.id === firstUnreadId && (
            <div className={s.mnew} role="separator">
              <span>{unreadCount} new</span>
            </div>
          )}
          {row(m, stamp(m.createdAt, messages[i - 1]?.createdAt))}
        </Fragment>
      ))}
    </>
  );
}
