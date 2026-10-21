'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Avatar, Icon } from '@/components/otw';
import type { IconName } from '@/lib/otw/icons';
import type { Member } from '@/lib/otw/data';
import { driveThumb } from '@/lib/otw/drive';
import { EVERYONE, splitMentions } from '@/lib/otw/mentions';
import { SWIPE_REPLY_PX, swipeIntent, swipeTriggersReply } from '@/lib/otw/chat-swipe';
import type { ChatMessageVM, ReactionType } from '@/lib/api/types';
import { galaHref } from '../nav';
import { ReplyQuote } from './ReplyQuote';
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
export const BY_TYPE = new Map(REACTIONS.map((r) => [r.type, r]));

/** Hold this long (ms) on a touch screen to open a message's actions. */
const LONG_PRESS_MS = 400;
/** How far (px) a swiped bubble follows the finger. */
const SWIPE_MAX_PX = 80;

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
  /** Starts a reply to this message in the composer. */
  onReply: (m: ChatMessageVM) => void;
  /** Scrolls to (and flashes) the message a reply quotes. */
  onJumpTo: (id: string) => void;
  /** Opens the "who reacted" sheet for this message. */
  onShowReactions: (m: ChatMessageVM) => void;
}

/** The chat log body: member / own / system / card messages and the "N new" divider (reference views.chat). */
export function MessageList({
  code,
  messages,
  members,
  nameOf,
  myUserId,
  firstUnreadId,
  unreadCount,
  onReact,
  onReply,
  onJumpTo,
  onShowReactions,
}: MessageListProps) {
  // Which message's actions (reaction picker + Reply) are open. Escape or a tap anywhere else closes them.
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
    const open = picking === m.id;
    return (
      <Bubble me={me} onReply={() => onReply(m)} onLongPress={() => setPicking(m.id)} id={m.id}>
        {!me && <Avatar name={who} tone={member?.c} size={32} online={member?.on === 1} userId={member?.id} />}
        <div className={s.mb}>
          <span className={s.mn}>
            {me ? 'You' : who}
            <i>{tm}</i>
          </span>
          {m.replyTo && (
            <ReplyQuote
              name={m.replyTo.senderUserId === myUserId ? 'You' : nameOf(m.replyTo.senderUserId)}
              snippet={m.replyTo.snippet}
              hasPhoto={m.replyTo.hasPhoto}
              onClick={() => onJumpTo(m.replyTo!.id)}
            />
          )}
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
          {m.body && <p>{body(m, nameOf, myUserId)}</p>}
          {open && (
            <Picker
              m={m}
              onReact={onReact}
              onReply={() => onReply(m)}
              close={() => setPicking(null)}
            />
          )}
          <ReactionPill m={m} onClick={() => onShowReactions(m)} />
        </div>
        <div className={s.acts}>
          <button
            type="button"
            className={s.act}
            aria-label="React"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              setPicking(open ? null : m.id);
            }}
          >
            <Icon name="react" size={18} />
          </button>
          <button type="button" className={s.act} aria-label="Reply" onClick={() => onReply(m)}>
            <Icon name="reply" size={18} />
          </button>
        </div>
      </Bubble>
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

/** A body with its @mentions drawn as chips; @me and @everyone stand out more. Text only, never HTML. */
function body(m: ChatMessageVM, nameOf: (id: string | null) => string, myUserId: string): ReactNode {
  const labels = (m.mentions ?? []).map((id) => ({ label: nameOf(id), mine: id === myUserId }));
  if (m.mentionsEveryone) labels.push({ label: EVERYONE, mine: true });
  if (!labels.length) return m.body;
  return splitMentions(m.body, labels).map((seg, i) =>
    seg.mention ? (
      <span key={i} className={seg.mention.mine ? s.mentionMe : s.mention}>
        {seg.text}
      </span>
    ) : (
      <Fragment key={i}>{seg.text}</Fragment>
    )
  );
}

/**
 * One TEXT message row. On a touch screen: hold to open its actions, swipe toward the middle to
 * reply (a mostly vertical drag still scrolls the chat). Mouse users get the hover actions instead.
 */
function Bubble({
  id,
  me,
  onReply,
  onLongPress,
  children,
}: {
  id: string;
  me: boolean;
  onReply: () => void;
  onLongPress: () => void;
  children: ReactNode;
}) {
  const dir = me ? -1 : 1;
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; y: number; mode: 'none' | 'scroll' | 'swipe'; timer: number; pressed: boolean } | null>(null);

  // The click that ends a long press would close the actions it just opened.
  const swallowClick = useRef(false);

  const end = () => {
    if (drag.current) {
      window.clearTimeout(drag.current.timer);
      swallowClick.current = drag.current.pressed;
    }
    drag.current = null;
    setDx(0);
  };

  return (
    <div
      className={`${s.msg}${me ? ` ${s.me}` : ''}`}
      data-msg-id={id}
      style={dx ? { transform: `translateX(${dx}px)` } : undefined}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch') return;
        const timer = window.setTimeout(() => {
          if (drag.current?.mode === 'none') {
            drag.current.pressed = true;
            onLongPress();
          }
        }, LONG_PRESS_MS);
        drag.current = { x: e.clientX, y: e.clientY, mode: 'none', timer, pressed: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.pressed) return;
        const mx = e.clientX - d.x;
        if (d.mode === 'none') {
          d.mode = swipeIntent(mx, e.clientY - d.y);
          if (d.mode !== 'none') window.clearTimeout(d.timer);
        }
        // Only toward the middle of the chat, and only so far.
        if (d.mode === 'swipe') setDx(dir * Math.min(SWIPE_MAX_PX, Math.max(0, mx * dir)));
      }}
      onPointerUp={() => {
        if (drag.current?.mode === 'swipe' && swipeTriggersReply(dx, dir)) onReply();
        end();
      }}
      onPointerCancel={end}
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.stopPropagation();
        e.preventDefault();
      }}
      onContextMenu={(e) => {
        // A long press already opened the actions; don't also show the browser's menu.
        if (drag.current?.pressed) e.preventDefault();
      }}
    >
      {dx !== 0 && (
        <span className={s.swipehint} style={{ opacity: Math.min(1, Math.abs(dx) / SWIPE_REPLY_PX) }} aria-hidden="true">
          <Icon name="reply" size={18} />
        </span>
      )}
      {children}
    </div>
  );
}

/** The reaction picker (plus Reply) that hover, long-press or the React button opens. */
function Picker({
  m,
  onReact,
  onReply,
  close,
}: {
  m: ChatMessageVM;
  onReact: (id: string, reaction: ReactionType | null) => void;
  onReply: () => void;
  close: () => void;
}) {
  return (
    <div className={s.picker} role="menu" aria-label="Message actions" onClick={(e) => e.stopPropagation()}>
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
              close();
            }}
          >
            <Icon name={r.icon} size={22} />
          </button>
        );
      })}
      <button
        type="button"
        role="menuitem"
        aria-label="Reply"
        title="Reply"
        className={`${s.pick} ${s.pickreply}`}
        onClick={() => {
          onReply();
          close();
        }}
      >
        <Icon name="reply" size={22} />
      </button>
    </div>
  );
}

/** The pill under a bubble (used reactions + total). It opens the "who reacted" sheet. */
function ReactionPill({ m, onClick }: { m: ChatMessageVM; onClick: () => void }) {
  const used = REACTIONS.filter((r) => (m.reactions?.[r.type] ?? 0) > 0);
  const total = used.reduce((n, r) => n + (m.reactions?.[r.type] ?? 0), 0);
  if (!total) return null;
  const mine = m.myReaction ? BY_TYPE.get(m.myReaction) : undefined;
  return (
    <button
      type="button"
      className={`${s.react}${mine ? ` ${s.on}` : ''}`}
      aria-haspopup="dialog"
      aria-label={`Reactions: ${used.map((r) => `${m.reactions[r.type]} ${r.label}`).join(', ')}. ${mine ? `Yours: ${mine.label}. ` : ''}See who reacted`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {used.slice(0, 3).map((r) => (
        <span key={r.type} className={`${s.rdot} ${s[r.tone]}`}>
          <Icon name={r.icon} size={13} />
        </span>
      ))}
      {total > 1 && <b>{total}</b>}
    </button>
  );
}
