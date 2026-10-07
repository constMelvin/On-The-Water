'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Button, Icon } from '@/components/otw';
import { toast } from '@/lib/otw/feedback';
import { CameraCapture } from './CameraCapture';
import s from './chat.module.css';

export interface ComposerProps {
  /** Sends the text; returns false when nothing was sent (blank). */
  onSend: (text: string) => boolean;
  /** Uploads the photo to the Gala Dump and posts it with the text as its caption. */
  onSendPhoto: (file: File, caption: string) => Promise<boolean>;
  /** False when the Gala Leader turned off adding photos for members (hides the photo button). */
  canAddPhotos: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}

/** The message input, photo button and Send (reference .composer). Enter sends. */
export function Composer({ onSend, onSendPhoto, canAddPhotos, inputRef }: ComposerProps) {
  const [draft, setDraft] = useState('');
  // The picked photo and its local preview URL (released when it's replaced or on unmount).
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const photo = picked?.file ?? null;
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);

  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.url);
  }, [picked]);
  const setPhoto = (file: File | null) => setPicked(file ? { file, url: URL.createObjectURL(file) } : null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Only photos can go in the chat. Videos go in the Gala Dump.', 'err');
      return;
    }
    setPhoto(file);
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
    inputRef.current?.focus();
  };

  return (
    <div className={s.composerwrap}>
      {picked && (
        <div className={s.attach}>
          {/* Plain <img>: a local blob preview, which next/image can't optimize. */}
          <img src={picked.url} alt="Photo to send" />
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
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            // Pasting a screenshot attaches it, like Messenger.
            const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
            if (file && canAddPhotos) {
              e.preventDefault();
              pick(file);
            }
          }}
          onKeyDown={(e) => {
            // Don't send while an IME is still composing (e.g. accented input).
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
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
