'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Avatar, Icon } from '@/components/otw';
import type { IconName } from '@/lib/otw/icons';
import type { Member } from '@/lib/otw/data';
import { driveThumb } from '@/lib/otw/drive';
import type { ChatMessageVM, ReactionType } from '@/lib/api/types';
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

/** Picker order, icon, label and the brand color each reaction is drawn in. */
export const REACTIONS: { type: ReactionType; icon: IconName; label: string; tone: string }[] = [
  { type: 'HEART', icon: 'heart', label: 'Heart', tone: 'r-heart' },
  { type: 'HAHA', icon: 'haha', label: 'Haha', tone: 'r-haha' },
  { type: 'WOW', icon: 'wow', label: 'Wow', tone: 'r-wow' },
  { type: 'SAD', icon: 'sad', label: 'Sad', tone: 'r-sad' },
  { type: 'ANGRY', icon: 'angry', label: 'Angry', tone: 'r-angry' },
  { type: 'LIKE', icon: 'like', label: 'Like', tone: 'r-like' },
];
const BY_TYPE = new Map(REACTIONS.map((r) => [r.type, r]));

export interface MessageListProps {
  code: string;
  messages: ChatMessageVM[];
  members: Member[];
  nameOf: (userId: string | null) => string;
  myUserId: string;
  /** Id of the first unread message (the divider goes above it), or null for no divider. */
  firstUnreadId: string | null;
  unreadCount: number;
  /** Sets my reaction on a message; null removes it. */
  onReact: (id: string, reaction: ReactionType | null) => void;
}

/** The chat log body: member / own / system / card messages and the "N new" divider (reference views.chat). */
export function MessageList({ code, messages, members, nameOf, myUserId, firstUnreadId, unreadCount, onReact }: MessageListProps) {
  // Which message's reaction picker is open. Escape or a tap anywhere else closes it.
  const [picking, setPicking] = useState<string | null>(null);
  useEffect(() => {
    if (!picking) return;
    const close = () => setPicking(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [picking]);

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
        {!me && <Avatar name={who} tone={member?.c} size={32} online={member?.on === 1} userId={member?.id} />}
        <div className={s.mb}>
          <span className={s.mn}>
            {me ? 'You' : who}
            <i>{tm}</i>
          </span>
          {m.refType === 'PHOTO' &&
            (m.photo ? (
              <a
                className={s.mphoto}
                href={driveThumb(m.photo.driveFileId, 1600)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${me ? 'your' : `${who}'s`} photo`}
              >
                {/* Plain <img>: a Drive thumbnail URL (next/image would need Drive as a remote host). */}
                <img src={driveThumb(m.photo.driveFileId, 640)} alt="" loading="lazy" />
              </a>
            ) : (
              <p className={s.mgone}>Photo removed from the Gala Dump.</p>
            ))}
          {m.body && <p>{m.body}</p>}
          <Reactions m={m} open={picking === m.id} setOpen={(o) => setPicking(o ? m.id : null)} onReact={onReact} />
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

/** The reaction pill under a bubble (used reactions + total) and the picker it opens. */
function Reactions({
  m,
  open,
  setOpen,
  onReact,
}: {
  m: ChatMessageVM;
  open: boolean;
  setOpen: (open: boolean) => void;
  onReact: (id: string, reaction: ReactionType | null) => void;
}) {
  const used = REACTIONS.filter((r) => (m.reactions?.[r.type] ?? 0) > 0);
  const total = used.reduce((n, r) => n + (m.reactions?.[r.type] ?? 0), 0);
  const mine = m.myReaction ? BY_TYPE.get(m.myReaction) : undefined;
  return (
    <div className={s.reactwrap} onClick={(e) => e.stopPropagation()}>
      {open && (
        <div className={s.picker} role="menu" aria-label="Pick a reaction">
          {REACTIONS.map((r) => {
            const on = m.myReaction === r.type;
            return (
              <button
                key={r.type}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                aria-label={on ? `Remove ${r.label}` : r.label}
                title={r.label}
                className={`${s.pick} ${s[r.tone]}${on ? ` ${s.on}` : ''}`}
                onClick={() => {
                  onReact(m.id, on ? null : r.type);
                  setOpen(false);
                }}
              >
                <Icon name={r.icon} size={22} />
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className={`${s.react}${mine ? ` ${s.on}` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          total
            ? `Reactions: ${used.map((r) => `${m.reactions[r.type]} ${r.label}`).join(', ')}. ${mine ? `Yours: ${mine.label}. ` : ''}Change`
            : 'Add a reaction'
        }
        onClick={() => setOpen(!open)}
      >
        {total ? (
          <>
            {used.slice(0, 3).map((r) => (
              <span key={r.type} className={`${s.rdot} ${s[r.tone]}`}>
                <Icon name={r.icon} size={13} />
              </span>
            ))}
            {total > 1 && <b>{total}</b>}
          </>
        ) : (
          <Icon name="react" size={16} />
        )}
      </button>
    </div>
  );
}
