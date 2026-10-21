'use client';

import { Icon } from '@/components/otw';
import s from './chat.module.css';

/** The quoted message above a reply. Clicking it jumps to the original. */
export function ReplyQuote({
  name,
  snippet,
  hasPhoto,
  onClick,
}: {
  name: string;
  snippet: string;
  hasPhoto: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={s.quote} onClick={onClick} aria-label={`Replying to ${name}. Show the original message`}>
      <b>
        <Icon name="reply" size={13} /> {name}
      </b>
      <span>{snippet || (hasPhoto ? 'Photo' : '…')}</span>
    </button>
  );
}
