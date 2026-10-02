'use client';

import { useState, type RefObject } from 'react';
import { Button, Icon } from '@/components/otw';
import s from './chat.module.css';

/** Reference quick replies. */
const QUICK = ['G!', 'OTW na', 'Saan na?', 'Sino may car?'];

export interface ComposerProps {
  /** Sends the text; returns false when nothing was sent (blank). */
  onSend: (text: string) => boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}

/** Quick-reply chips + the message input and Send (reference .quick / .composer). Enter sends. */
export function Composer({ onSend, inputRef }: ComposerProps) {
  const [draft, setDraft] = useState('');

  const send = () => {
    if (onSend(draft)) setDraft('');
    inputRef.current?.focus();
  };

  return (
    <>
      <div className={s.quick} role="group" aria-label="Quick replies">
        {QUICK.map((q) => (
          <button key={q} type="button" className="chip" onClick={() => onSend(q)}>
            {q}
          </button>
        ))}
      </div>
      <div className={s.composer}>
        <input
          ref={inputRef}
          className="in"
          placeholder="Say something to the gala…"
          aria-label="Message"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Don't send while an IME is still composing (e.g. accented input).
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button sm aria-label="Send" onClick={send}>
          <Icon name="send" size={18} />
          <span className="hide-m">Send</span>
        </Button>
      </div>
    </>
  );
}
