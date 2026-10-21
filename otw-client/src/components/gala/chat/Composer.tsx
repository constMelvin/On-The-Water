'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Button, Icon } from '@/components/otw';
import { toast } from '@/lib/otw/feedback';
import { EVERYONE, activeMentionQuery, hasEveryone, insertMention, mentionIdsInBody, type Mentionable } from '@/lib/otw/mentions';
import type { ChatMessageVM } from '@/lib/api/types';
import { CameraCapture } from './CameraCapture';
import { MentionPicker, mentionOptions, type MentionOption } from './MentionPicker';
import s from './chat.module.css';

/** Who a message @mentions, worked out from the draft when it's sent. */
export interface SendMentions {
  ids: string[];
  everyone: boolean;
}

export interface ComposerProps {
  /** Sends the text; returns false when nothing was sent (blank). */
  onSend: (text: string, mentions: SendMentions) => boolean;
  /** Uploads the photo to the Gala Dump and posts it with the text as its caption. */
  onSendPhoto: (file: File, caption: string, mentions?: SendMentions) => Promise<boolean>;
  /** False when the Gala Leader turned off adding photos for members (hides the photo button). */
  canAddPhotos: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  /** The message being replied to (banner above the input), or null. */
  replyTo: ChatMessageVM | null;
  /** Display name of the person being replied to. */
  replyName: string;
  onCancelReply: () => void;
  /** Members I can @mention (everyone else in the gala). */
  mentionable: MentionOption[];
}

/** The message input, photo button and Send (reference .composer). Enter sends; @ opens the mention list. */
export function Composer({
  onSend,
  onSendPhoto,
  canAddPhotos,
  inputRef,
  replyTo,
  replyName,
  onCancelReply,
  mentionable,
}: ComposerProps) {
  const [draft, setDraft] = useState('');
  const [caret, setCaret] = useState(0);
  // Members picked from the @ list for this draft (kept only while their @name is still in it).
  const [picked, setPicked] = useState<Mentionable[]>([]);
  const [active, setActive] = useState(0);
  // The @ position the user closed the list for with Escape, so it stays closed while they keep typing.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const listId = useId();
  // The picked photo and its local preview URL (released when it's replaced or on unmount).
  const [attached, setAttached] = useState<{ file: File; url: string } | null>(null);
  const photo = attached?.file ?? null;
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);

  useEffect(() => {
    if (!attached) return;
    return () => URL.revokeObjectURL(attached.url);
  }, [attached]);
  const setPhoto = (file: File | null) => setAttached(file ? { file, url: URL.createObjectURL(file) } : null);

  // Replying puts the cursor in the input, like Messenger.
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo, inputRef]);

  const query = activeMentionQuery(draft, caret);
  const options = query && query.start !== dismissedAt ? mentionOptions(query.query, mentionable) : [];
  const listOpen = options.length > 0;

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Only photos can go in the chat. Videos go in the Gala Dump.', 'err');
      return;
    }
    setPhoto(file);
    inputRef.current?.focus();
  };

  const pickMention = (o: MentionOption) => {
    if (!query) return;
    const next = insertMention(draft, query.start, caret, o.label);
    setDraft(next.text);
    setCaret(next.caret);
    setPicked((p) => (p.some((x) => x.userId === o.userId) ? p : [...p, { userId: o.userId, label: o.label }]));
    setActive(0);
    // Put the caret after the inserted name once React has rendered the new value.
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(next.caret, next.caret));
  };

  const mentions = (): SendMentions => ({
    ids: mentionIdsInBody(draft, picked),
    everyone: picked.some((p) => p.userId === EVERYONE) && hasEveryone(draft),
  });

  const reset = () => {
    setDraft('');
    setCaret(0);
    setPicked([]);
    setDismissedAt(null);
  };

  const send = async () => {
    if (sending) return;
    if (photo) {
      setSending(true);
      const ok = await onSendPhoto(photo, draft, mentions());
      setSending(false);
      if (ok) {
        setPhoto(null);
        reset();
      }
    } else if (onSend(draft, mentions())) {
      reset();
    }
    inputRef.current?.focus();
  };

  return (
    <div className={s.composerwrap}>
      {listOpen && (
        <MentionPicker
          id={listId}
          options={options}
          active={Math.min(active, options.length - 1)}
          memberCount={mentionable.length + 1}
          onPick={pickMention}
        />
      )}
      {replyTo && (
        <div className={s.replybar}>
          <Icon name="reply" size={18} />
          <div>
            <b>Replying to {replyName}</b>
            <span>{replyTo.body || (replyTo.photo ? 'Photo' : '…')}</span>
          </div>
          <button type="button" className="ibtn" aria-label="Cancel reply" onClick={onCancelReply}>
            <Icon name="x" size={18} />
          </button>
        </div>
      )}
      {attached && (
        <div className={s.attach}>
          {/* Plain <img>: a local blob preview, which next/image can't optimize. */}
          <img src={attached.url} alt="Photo to send" />
          <span>{sending ? 'Sending to the chat and the Gala Dump…' : 'Goes to the chat and the Gala Dump.'}</span>
          {!sending && (
            <button type="button" className="ibtn" aria-label="Remove photo" onClick={() => setPhoto(null)}>
              <Icon name="x" size={18} />
            </button>
          )}
        </div>
      )}
      <div className={s.composer}>
        {canAddPhotos && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = ''; // picking the same file again still fires onChange
              }}
            />
            <button
              type="button"
              className={`ibtn ${s.attachbtn}`}
              aria-label="Add a photo"
              disabled={sending}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="image" size={22} />
            </button>
            <button
              type="button"
              className={`ibtn ${s.attachbtn}`}
              aria-label="Take a photo"
              disabled={sending}
              onClick={() => setCamera(true)}
            >
              <Icon name="camera" size={22} />
            </button>
          </>
        )}
        <input
          ref={inputRef}
          className="in"
          placeholder={photo ? 'Add a caption…' : 'Say something to the gala…'}
          aria-label={photo ? 'Caption' : 'Message'}
          autoComplete="off"
          maxLength={1000}
          value={draft}
          disabled={sending}
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-activedescendant={listOpen ? `${listId}-${Math.min(active, options.length - 1)}` : undefined}
          aria-autocomplete="list"
          onChange={(e) => {
            setDraft(e.target.value);
            setCaret(e.target.selectionStart ?? e.target.value.length);
            setActive(0);
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
          onPaste={(e) => {
            // Pasting a screenshot attaches it, like Messenger.
            const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
            if (file && canAddPhotos) {
              e.preventDefault();
              pick(file);
            }
          }}
          onKeyDown={(e) => {
            // Don't act while an IME is still composing (e.g. accented input).
            if (e.nativeEvent.isComposing) return;
            if (listOpen) {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const n = options.length;
                setActive((a) => (Math.min(a, n - 1) + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
                return;
              }
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                pickMention(options[Math.min(active, options.length - 1)]);
                return;
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setDismissedAt(query!.start);
                return;
              }
            }
            if (e.key === 'Escape' && replyTo) {
              e.preventDefault();
              onCancelReply();
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button sm aria-label="Send" onClick={() => void send()} disabled={sending}>
          <Icon name="send" size={18} />
          <span className="hide-m">{sending ? 'Sending…' : 'Send'}</span>
        </Button>
      </div>
      {camera && (
        <CameraCapture
          onSend={onSendPhoto}
          onClose={() => {
            setCamera(false);
            inputRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
