'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/otw';
import s from './camera.module.css';

type Facing = 'environment' | 'user';
type Status = 'starting' | 'live' | 'blocked' | 'unsupported';

/** Longest side of a captured photo, in pixels (keeps uploads quick on mobile data). */
const MAX_SIDE = 1600;

export interface CameraCaptureProps {
  onClose: () => void;
  /** Uploads the shot to the Gala Dump and posts it with the caption; true when it went through. */
  onSend: (file: File, caption: string) => Promise<boolean>;
}

/**
 * Full-screen camera, like Messenger / Instagram / Telegram: live view, shutter, flip, then a
 * preview to send (with a caption) or retake. Falls back to the phone's own camera app when the
 * browser can't open the camera here (no permission, or the page isn't on HTTPS).
 */
export function CameraCapture({ onClose, onSend }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [status, setStatus] = useState<Status>('starting');
  const [canFlip, setCanFlip] = useState(false);
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  // Live view: (re)opens the camera for the chosen side; stops it while previewing and on close.
  useEffect(() => {
    if (shot) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setStatus('unsupported'));
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(async (st) => {
        if (cancelled) {
          st.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = st;
        const v = videoRef.current;
        if (v) {
          v.srcObject = st;
          await v.play().catch(() => undefined);
        }
        setStatus('live');
        shutterRef.current?.focus();
        // Device labels/count are only known after permission is granted.
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const name = e instanceof DOMException ? e.name : '';
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'blocked' : 'unsupported');
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, shot]);

  // Release the preview's blob URL when it's replaced or the camera closes.
  useEffect(() => {
    if (!shot) return;
    return () => URL.revokeObjectURL(shot.url);
  }, [shot]);

  // Escape closes (but not mid-send).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || status !== 'live' || !v.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (facing === 'user') {
      // The selfie view is shown mirrored, so save it the way the person saw it.
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `otw-camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setShot({ file, url: URL.createObjectURL(file) });
      },
      'image/jpeg',
      0.88
    );
  };

  const flip = () => {
    setStatus('starting');
    setFacing((f) => (f === 'environment' ? 'user' : 'environment'));
  };

  const retake = () => {
    setStatus('starting');
    setShot(null);
  };

  const send = async () => {
    if (!shot || sending) return;
    setSending(true);
    const ok = await onSend(shot.file, caption);
    setSending(false);
    if (ok) onClose();
  };

  const fromNative = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setShot({ file, url: URL.createObjectURL(file) });
  };

  return createPortal(
    <div className={s.cam} role="dialog" aria-modal="true" aria-label={shot ? 'Send this photo?' : 'Camera'}>
      {/* The phone's own camera app: the fallback when the camera can't open in the page. */}
      <input
        ref={nativeRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          fromNative(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <div className={s.top}>
        <button
          type="button"
          className={s.round}
          onClick={shot ? retake : onClose}
          disabled={sending}
          aria-label={shot ? 'Back to the camera' : 'Close the camera'}
        >
          <Icon name={shot ? 'back' : 'x'} size={24} />
        </button>
        {shot && <span className={s.title}>Send this photo?</span>}
      </div>

      {shot ? (
        <>
          {/* Plain <img>: a local blob preview, which next/image can't optimize. */}
          <img className={s.media} src={shot.url} alt="Photo you just took" />
          <div className={s.bottom}>
            <input
              className={`in ${s.caption}`}
              placeholder="Add a caption…"
              aria-label="Caption"
              maxLength={1000}
              value={caption}
              disabled={sending}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <div className={s.row}>
              <button type="button" className={s.ghost} onClick={retake} disabled={sending}>
                <Icon name="refresh" size={20} /> Retake
              </button>
              <button
                type="button"
                className={s.send}
                onClick={() => void send()}
                disabled={sending}
                aria-label="Send photo"
              >
                {sending ? 'Sending…' : 'Send'} <Icon name="send" size={20} />
              </button>
            </div>
            <p className={s.note}>Goes to the chat and the Gala Dump.</p>
          </div>
        </>
      ) : status === 'blocked' || status === 'unsupported' ? (
        <div className={s.fallback}>
          <span className={s.fbIcon} aria-hidden="true">
            <Icon name="camera" size={44} />
          </span>
          <p className={s.fbText}>
            {status === 'blocked'
              ? 'OTW can’t use your camera yet. Allow camera access in your browser settings, or snap one with your phone’s camera.'
              : 'Your browser can’t open the camera here. Snap one with your phone’s camera instead.'}
          </p>
          <button type="button" className={s.send} onClick={() => nativeRef.current?.click()}>
            <Icon name="camera" size={20} /> Open phone camera
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className={`${s.media}${facing === 'user' ? ` ${s.mirror}` : ''}`}
            playsInline
            muted
            autoPlay
            aria-label="Camera view"
          />
          {status === 'starting' && <p className={s.starting}>Opening the camera…</p>}
          <div className={s.controls}>
            <span className={s.spacer} />
            <button
              ref={shutterRef}
              type="button"
              className={s.shutter}
              onClick={capture}
              disabled={status !== 'live'}
              aria-label="Take photo"
            />
            {canFlip ? (
              <button type="button" className={s.round} onClick={flip} aria-label="Switch camera">
                <Icon name="refresh" size={24} />
              </button>
            ) : (
              <span className={s.spacer} />
            )}
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
