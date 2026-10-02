'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './plan.module.css';
import { createRoom } from '@/lib/api/rooms';
import { addDays, galaRoute, normCode, rememberRoom } from '@/lib/otw/gala-registry';
import { toast as notify } from '@/lib/otw/feedback';
import { useAccount } from '@/lib/auth/session';

/**
 * Fast-Track Plan a Gala: one create screen, then the celebration. The account gate lives in
 * plan/layout.tsx (<RequireAccount ctx="plan">) and is untouched.
 *
 * Fields that left this screen are still collected later, on the dashboard:
 * - TODO(team): dashboard Settings: let the host pick the date/time (PATCH /rooms/{id}) and the
 *   destination. Until then POST /rooms gets the placeholders below.
 * - TODO(team): dashboard Settings: show the generated Gala Password (read it from
 *   sessionStorage 'otw:gala-password') and let the host change it (PUT /rooms/{id}/settings/password).
 * - TODO(backend): the host vibe has no field on the room/member yet; it is client-only for now.
 */

/** Matches CreateRoomRequest.nickname (max 60) on the backend. */
const NICKNAME_MAX = 40;
const NAME_MIN = 2;
const NAME_MAX = 40;

// TODO(backend): CreateRoomRequest still requires startDate + destination + password, so the
// create call sends these until the dashboard collects the real ones (or the API makes them optional).
const DEFAULT_DAYS_AHEAD = 30;
const DEFAULT_DESTINATION = 'TBD';

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Random 8-character gala password (6 to 72 is what the backend accepts). */
function generatePassword(): string {
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join('');
}

/** Today as YYYY-MM-DD in local time (not UTC). */
function localToday(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/* ---------------- icons (24px, 2px stroke, inline SVG only) ---------------- */

const ICON: Record<string, ReactNode> = {
  pin: (
    <>
      <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.4" />
    </>
  ),
  sparkle: <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" stroke="none" />,
  coffee: (
    <>
      <path d="M4 8h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
      <path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 3v2M11 3v2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </>
  ),
  burst: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  cap: (
    <>
      <path d="M3 9l9-4 9 4-9 4z" />
      <path d="M7 11v4c0 1 2.2 2 5 2s5-1 5-2v-4" />
      <path d="M21 9v5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="3" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  arrowr: <path d="M5 12h14M13 6l6 6-6 6" />,
};

function Ic({ name, size = 24 }: { name: keyof typeof ICON; size?: number }) {
  return (
    <svg
      className={styles.icon}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON[name]}
    </svg>
  );
}

/* ---------------- presets and vibes (copy from the prototype) ---------------- */

const PRESETS: { label: string; icon: keyof typeof ICON }[] = [
  { label: "Hindi 'to Drawing", icon: 'sparkle' },
  { label: 'Biglaang Coffee Run', icon: 'coffee' },
  { label: 'Siargao 2026, manifesting', icon: 'sparkle' },
  { label: 'Beach Day', icon: 'sun' },
  { label: 'Birthday Gala', icon: 'burst' },
  { label: 'Graduation Trip', icon: 'cap' },
];

const VIBES = [
  { k: 'chaotic', l: 'chaotic' },
  { k: 'chill', l: 'chill' },
  { k: 'mom', l: 'mom-friend' },
  { k: 'hype', l: 'hype' },
  { k: 'late', l: 'late king/queen' },
];

/* ---------------- sparkle burst (React state, so the CSS module keyframes apply) ---------------- */

const BURST_COLORS = ['#f8e140', '#e0417c', '#fff8f2', '#2f8aa3', '#f8e140', '#e0417c', '#fff8f2'];
const CONFETTI_COLORS = ['#f8e140', '#fff8f2', '#2f8aa3'];

interface Spark {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
}

let sparkId = 0;

function useBurst() {
  const [sparks, setSparks] = useState<Spark[]>([]);

  const fire = (el: HTMLElement, big = false) => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const n = big ? 14 : 7;
    const made: Spark[] = Array.from({ length: n }, (_, i) => {
      const a = Math.random() * Math.PI * 2;
      const d = (big ? 70 : 44) + Math.random() * (big ? 90 : 52);
      return { id: ++sparkId, x, y, tx: Math.cos(a) * d, ty: Math.sin(a) * d, color: BURST_COLORS[i % BURST_COLORS.length] };
    });
    setSparks((cur) => [...cur, ...made]);
    const ids = new Set(made.map((s) => s.id));
    setTimeout(() => setSparks((cur) => cur.filter((s) => !ids.has(s.id))), 780);
  };

  const layer = (
    <>
      {sparks.map((s) => (
        <span
          key={s.id}
          className={styles.spark}
          style={{ left: s.x, top: s.y, color: s.color, '--tx': `${s.tx.toFixed(0)}px`, '--ty': `${s.ty.toFixed(0)}px` } as React.CSSProperties}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" />
          </svg>
        </span>
      ))}
    </>
  );

  return { fire, layer };
}

/** Clipboard API first, hidden-textarea fallback; resolves to whether it worked. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function PlanPage() {
  const router = useRouter();
  const account = useAccount();
  const burst = useBurst();

  const [stage, setStage] = useState<'create' | 'done'>('create');
  const [name, setName] = useState('');
  const [vibe, setVibe] = useState('chill');
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [createdTitle, setCreatedTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);

  const hostName = account.displayName.trim();
  const shareMsg = `G tayo? Join our gala "${createdTitle}". Code: ${code}`;

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    if (stage === 'done') doneHeadingRef.current?.focus();
  }, [stage]);

  const pickPreset = (label: string) => {
    setName(label);
    setError('');
    setFilling(true);
    setTimeout(() => setFilling(false), 260);
    inputRef.current?.focus();
  };

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const title = name.trim();
    if (title.length < NAME_MIN || title.length > NAME_MAX) {
      setError('Give your gala a name (at least 2 characters).');
      inputRef.current?.focus();
      return;
    }
    setError('');
    setSubmitting(true);
    const btn = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    try {
      const password = generatePassword();
      // POST /rooms (same call as before): the creator becomes the Gala Leader (host).
      const room = await createRoom({
        title,
        nickname: (hostName || 'Host').slice(0, NICKNAME_MAX),
        startDate: addDays(localToday(), DEFAULT_DAYS_AHEAD),
        destination: DEFAULT_DESTINATION,
        password,
        type: 'GROUP',
      });
      const roomCode = normCode(room.roomCode);
      rememberRoom(roomCode, room.id);
      try {
        // TODO(D3-01): replace with real state. Settings reads this to show the Gala Password.
        sessionStorage.setItem('otw:gala-password', password);
      } catch {
        /* storage blocked: the host can set a new password in Settings */
      }
      setCode(roomCode);
      setCreatedTitle(room.title || title);
      if (btn) burst.fire(btn, true);
      setTimeout(() => setStage('done'), 240);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't create the gala. Try again.", 'err');
      setSubmitting(false);
    }
  };

  const copy = async (el: HTMLElement, text: string, okMsg: string) => {
    const ok = await copyText(text);
    burst.fire(el);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      setToastMsg(okMsg);
    } else {
      notify("Couldn't copy. Select it and copy by hand.", 'err');
    }
  };

  const share = async (el: HTMLElement) => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: shareMsg });
        burst.fire(el);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    await copy(el, shareMsg, 'Nakopya ang invite. Paste mo sa GC.');
  };

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.wordmark} aria-label="OTW home">
          <span className={styles.wordmarkPin}>
            <Ic name="pin" size={26} />
          </span>
          OTW
        </Link>
        <Link href="/" className={styles.closeBtn} aria-label="Cancel and return home">
          <Ic name="x" size={20} />
        </Link>
      </div>

      {stage === 'create' ? (
        <form className={styles.create} onSubmit={create} noValidate>
          <div>
            <h1 className={styles.heading}>Anong gala &apos;to?</h1>
            <p className={styles.sub}>Pangalanan mo, tapos ilapag na sa GC.</p>
          </div>

          <input
            ref={inputRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            maxLength={NAME_MAX}
            placeholder="Baguio Before Graduation"
            aria-label="Gala name"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'gala-name-error' : undefined}
            autoComplete="off"
            className={`${styles.input} ${filling ? styles.inputFilling : ''} ${error ? styles.inputError : ''}`}
          />
          {error && (
            <p id="gala-name-error" role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <div className={styles.chips} role="group" aria-label="Preset gala names">
            {PRESETS.map((p) => {
              const active = name === p.label;
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`${styles.chip} ${styles.preset} ${active ? styles.presetActive : ''}`}
                  aria-pressed={active}
                  onClick={() => pickPreset(p.label)}
                >
                  <span className={styles.presetIcon}>
                    <Ic name={p.icon} size={15} />
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className={styles.divider} />

          <div>
            <p className={styles.vibeLabel}>Ikaw ang nag-organize. Anong vibe mo?</p>
            <div className={styles.vibeRow}>
              <span className={styles.avatar} aria-hidden="true">
                {(hostName[0] ?? '?').toUpperCase()}
              </span>
              <div className={styles.vibes} role="group" aria-label="Your vibe">
                {VIBES.map((v) => (
                  <button
                    key={v.k}
                    type="button"
                    className={`${styles.chip} ${styles.vibe} ${vibe === v.k ? styles.vibeOn : ''}`}
                    aria-pressed={vibe === v.k}
                    onClick={() => setVibe(v.k)}
                  >
                    {v.l}
                  </button>
                ))}
              </div>
            </div>
            <p className={styles.vibeHint}>{hostName || 'Ikaw'} · tap para palitan ang vibe</p>
          </div>

          <button type="submit" disabled={submitting} className={`${styles.btn} ${styles.cta}`}>
            {submitting ? 'Sandali lang...' : 'G na agad!'}
          </button>
          <p className={styles.reassure}>Walang petsa? Okay lang. Ayusin n&apos;yo sa loob.</p>
        </form>
      ) : (
        <div className={styles.done}>
          <div className={styles.confettiLayer} aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className={styles.confetti}
                style={{
                  left: `${8 + i * 9}%`,
                  background: CONFETTI_COLORS[i % 3],
                  animationDuration: `${900 + i * 70}ms`,
                  animationDelay: `${i * 40}ms`,
                }}
              />
            ))}
          </div>

          <span className={styles.blob}>
            <Ic name="burst" size={44} />
          </span>
          <h1 ref={doneHeadingRef} tabIndex={-1} className={`${styles.heading} ${styles.headingSm}`}>
            Ayan. Hindi na &apos;to Drawing.
          </h1>
          <p className={styles.doneSub}>Ilapag mo na &apos;to sa GC bago mag-isip ulit.</p>

          <div className={styles.ticket}>
            <div className={styles.ticketText}>
              <div className={styles.ticketLabel}>Gala Code</div>
              <b className={styles.code}>{code}</b>
            </div>
            <button
              type="button"
              className={`${styles.btn} ${styles.copyBtn}`}
              aria-label="Copy code"
              onClick={(e) => copy(e.currentTarget, code, 'Nakopya na. Ilapag mo na sa GC.')}
            >
              <Ic name={copied ? 'check' : 'copy'} size={22} />
            </button>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.actionBtn} ${styles.invite}`}
              onClick={(e) => copy(e.currentTarget, shareMsg, 'Nakopya ang invite. Paste mo sa GC.')}
            >
              <Ic name="copy" size={18} /> Kopyahin ang invite
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.actionBtn} ${styles.share}`}
              onClick={(e) => share(e.currentTarget)}
            >
              <Ic name="share" size={18} /> I-share
            </button>
          </div>

          <div className={styles.message}>&ldquo;{shareMsg}&rdquo;</div>

          <button type="button" className={`${styles.btn} ${styles.enter}`} onClick={() => router.push(galaRoute(code))}>
            Pumasok sa gala <Ic name="arrowr" size={20} />
          </button>
        </div>
      )}

      {toastMsg && (
        <div className={styles.toast} role="status">
          <Ic name="check" size={18} />
          <span>{toastMsg}</span>
        </div>
      )}
      {burst.layer}
    </main>
  );
}
