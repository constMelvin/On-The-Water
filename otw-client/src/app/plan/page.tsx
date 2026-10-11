'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './plan.module.css';
import { createRoom } from '@/lib/api/rooms';
import { galaRoute, normCode, rememberRoom } from '@/lib/otw/gala-registry';
import { DateRangePicker } from '@/components/plan/DateRangePicker';
import { LocationPicker } from '@/components/plan/LocationPicker';
import { toast as notify } from '@/lib/otw/feedback';
import { useAccount } from '@/lib/auth/session';
import { useProfile } from '@/lib/otw/profile';
import { AccountCluster } from '@/components/nav/AccountCluster';

/**
 * Fast-Track Plan a Gala: one create screen, then the celebration. The account gate lives in
 * plan/layout.tsx (<RequireAccount ctx="plan">) and is untouched.
 *
 * Everything POST /rooms stores is collected here (CreateRoomRequest): name, type (group or
 * couple), the host's nickname, start date (required), end date, start / end time, destination
 * (required), a meeting place and the Gala Password. The leader can edit all of it in Settings.
 * - The host picks the Gala Password here (6 to 72 characters); this device keeps a copy in
 *   sessionStorage 'otw:gala-password' so Settings can show it, and Settings can change it.
 * - TODO(backend): the host vibe has no field on the room/member yet; it is client-only for now.
 */

/** Matches CreateRoomRequest.nickname (max 60) on the backend. */
const NICKNAME_MAX = 40;
const NAME_MIN = 2;
const NAME_MAX = 40;

/** CreateRoomRequest limits. */
const DESTINATION_MAX = 150;
const MEETING_MAX = 255;

/** What the backend accepts for a Gala Password (CreateRoomRequest.password). */
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

/** Midnight today, local time (the date picker's earliest day). */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
  const [galaType, setGalaType] = useState<'GROUP' | 'COUPLE'>('GROUP');
  const [nickname, setNickname] = useState('');
  const [destination, setDestination] = useState('');
  // The picked place's map pin; typing over the text drops it (LocationPicker sends no coords then).
  const [destinationPin, setDestinationPin] = useState<{ lat: number; lng: number } | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [meetingLabel, setMeetingLabel] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [createdPassword, setCreatedPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [createdTitle, setCreatedTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);

  const hostName = account.displayName.trim();

  // Couple Mode's "Start Couple Mode" opens /plan?type=couple. Read after mount (no URL on the server).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get('type') === 'couple') setGalaType('COUPLE');
  }, []);
  // The nickname starts as the saved profile nickname, else the account name (still editable). Only an
  // empty field, or one we filled in ourselves, is replaced (the profile can load a moment after the account).
  const { profile } = useProfile();
  const autoNickname = useRef('');
  useEffect(() => {
    const want = (profile?.nickname || hostName).slice(0, NICKNAME_MAX);
    if (!want) return;
    const prev = autoNickname.current;
    autoNickname.current = want;
    setNickname((n) => (n === '' || n === prev ? want : n));
  }, [profile?.nickname, hostName]);
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
    const detailsProblem = !nickname.trim()
      ? 'Add your nickname for this gala.'
      : !destination.trim()
        ? 'Where are you going? Add a destination.'
        : !startDate
          ? 'Pick the start date.'
          : endDate && endDate < startDate
            ? "The end date can't be before the start date."
            : endTime && !startTime
              ? 'Add a start time too, or clear the end time.'
              : (!endDate || endDate === startDate) && startTime && endTime && endTime < startTime
                ? "The end time can't be before the start time."
                : '';
    if (detailsProblem) {
      setDetailsError(detailsProblem);
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setDetailsError('');
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      setPasswordError(`Set a Gala Password (${PASSWORD_MIN} to ${PASSWORD_MAX} characters).`);
      passwordRef.current?.focus();
      return;
    }
    setPasswordError('');
    setSubmitting(true);
    const btn = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    try {
      // POST /rooms: the creator becomes the Gala Leader (host).
      const room = await createRoom({
        title,
        nickname: nickname.trim().slice(0, NICKNAME_MAX),
        startDate,
        ...(endDate && { endDate }),
        ...(startTime && { startTime }),
        ...(startTime && endTime && { endTime }),
        destination: destination.trim(),
        ...(destinationPin && { destinationLat: destinationPin.lat, destinationLng: destinationPin.lng }),
        ...(meetingLabel.trim() && { meetingLabel: meetingLabel.trim() }),
        password,
        type: galaType,
      });
      const roomCode = normCode(room.roomCode);
      rememberRoom(roomCode, room.id);
      try {
        // Settings reads this to show the Gala Password on this device.
        sessionStorage.setItem('otw:gala-password', password);
      } catch {
        /* storage blocked: the host can set a new password in Settings */
      }
      setCode(roomCode);
      setCreatedPassword(password);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AccountCluster onColor />
          <Link href="/" className={styles.closeBtn} aria-label="Cancel and return home">
            <Ic name="x" size={20} />
          </Link>
        </div>
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

          <div ref={detailsRef} className={styles.details}>
            <div className={styles.typeRow} role="group" aria-label="Gala type">
              {(
                [
                  ['GROUP', 'Barkada gala'],
                  ['COUPLE', 'Couple gala (2 lang)'],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  className={`${styles.chip} ${styles.vibe} ${galaType === k ? styles.vibeOn : ''}`}
                  aria-pressed={galaType === k}
                  onClick={() => setGalaType(k)}
                >
                  {l}
                </button>
              ))}
            </div>

            <label className={styles.field}>
              <span className={styles.vibeLabel}>Your nickname</span>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={NICKNAME_MAX}
                placeholder="Ano tawag sa'yo ng tropa?"
                autoComplete="off"
                className={`${styles.input} ${styles.inputSm}`}
              />
            </label>

            <div className={styles.field}>
              <label htmlFor="gala-destination" className={styles.vibeLabel}>
                Destination
              </label>
              <LocationPicker
                id="gala-destination"
                value={destination}
                onChange={(v, coords) => {
                  setDestination(v);
                  setDestinationPin(coords ?? null);
                  if (detailsError) setDetailsError('');
                }}
                maxLength={DESTINATION_MAX}
                placeholder="Search a place, e.g. Baguio City"
                inputClassName={`${styles.input} ${styles.inputSm}`}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="gala-dates" className={styles.vibeLabel}>
                Date
              </label>
              <DateRangePicker
                id="gala-dates"
                start={startDate}
                end={endDate}
                min={startOfToday()}
                onChange={(from, to) => {
                  setStartDate(from);
                  setEndDate(to);
                  if (detailsError) setDetailsError('');
                }}
                className={`${styles.input} ${styles.inputSm}`}
              />
            </div>

            <div className={styles.grid2}>
              <label className={styles.field}>
                <span className={styles.vibeLabel}>Start time (optional)</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`${styles.input} ${styles.inputSm}`}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.vibeLabel}>End time (optional)</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`${styles.input} ${styles.inputSm}`}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.vibeLabel}>Meeting place (optional)</span>
              <input
                value={meetingLabel}
                onChange={(e) => setMeetingLabel(e.target.value)}
                maxLength={MEETING_MAX}
                placeholder="Cubao bus terminal, Gate 2"
                autoComplete="off"
                className={`${styles.input} ${styles.inputSm}`}
              />
            </label>

            {detailsError && (
              <p role="alert" className={styles.error} style={{ marginTop: 0 }}>
                {detailsError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="gala-password" className={styles.vibeLabel}>
              Gala Password
            </label>
            <div className={styles.pwRow}>
              <input
                ref={passwordRef}
                id="gala-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                maxLength={PASSWORD_MAX}
                placeholder="Para sa barkada lang"
                autoComplete="new-password"
                aria-invalid={passwordError ? 'true' : 'false'}
                aria-describedby={passwordError ? 'gala-password-error' : 'gala-password-hint'}
                className={`${styles.input} ${passwordError ? styles.inputError : ''}`}
              />
              <button
                type="button"
                className={styles.pwToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {passwordError ? (
              <p id="gala-password-error" role="alert" className={styles.error} style={{ marginTop: 10 }}>
                {passwordError}
              </p>
            ) : (
              <p id="gala-password-hint" className={styles.vibeHint}>
                {PASSWORD_MIN} to {PASSWORD_MAX} characters. Everyone needs it to join, so share it with your barkada.
              </p>
            )}
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
          <p className={styles.reassure}>Pwede pang baguhin lahat sa Settings mamaya.</p>
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

          <div className={styles.ticket}>
            <div className={styles.ticketText}>
              <div className={styles.ticketLabel}>Gala Password</div>
              <b className={styles.code}>{createdPassword}</b>
            </div>
            <button
              type="button"
              className={`${styles.btn} ${styles.copyBtn}`}
              aria-label="Copy password"
              onClick={(e) => copy(e.currentTarget, createdPassword, 'Nakopya ang password.')}
            >
              <Ic name="copy" size={22} />
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
