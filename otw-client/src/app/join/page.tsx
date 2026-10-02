'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './join.module.css';
import { useRouter } from 'next/navigation';
import { lookupGala, joinGala, type GalaEvent } from './joinApi';
import { galaRoute, isValidCode, normCode, roomIdFor } from '@/lib/otw/gala-registry';
import { useAccount } from '@/lib/otw/auth-mock';

// Dashboard route for the gala the member just joined
const MEMBER_DASHBOARD_ROUTE = (code: string) => galaRoute(code);

interface Sparkle {
  id: number;
  tx: string;
  ty: string;
}

/**
 * Normalizes input code to the standard format OTW-XXXX-XXXX.
 * Accepts formats like 7K2PABCD, otw7k2pabcd, or OTW-7K2P-ABCD.
 */
const normalizeGalaCode = (value: string): string => normCode(value);

/** Low-opacity floating background shapes */
function BackgroundShapes() {
  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <symbol id="join-spark" viewBox="0 0 24 24">
            <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" />
          </symbol>
          <symbol id="join-ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" />
          </symbol>
          <symbol id="join-blob" viewBox="0 0 100 100">
            <path d="M52 4C78 2 98 22 96 50c-2 30-24 48-50 46C20 94 2 74 5 48 8 24 28 6 52 4Z" fill="currentColor" />
          </symbol>
        </defs>
      </svg>
      <div className={styles.bg} aria-hidden="true">
        <span
          className={styles.shapeWrap}
          style={{ '--l': '74%', '--t': '6%', '--w': '320px' } as React.CSSProperties}
        >
          <svg
            className={`${styles.shape} ${styles.drift}`}
            viewBox="0 0 100 100"
            style={{ '--c': 'var(--teal-dark)', '--o': 0.3, '--dur': '22s', '--r': '15deg' } as React.CSSProperties}
          >
            <use href="#join-blob" />
          </svg>
        </span>
        <span
          className={styles.shapeWrap}
          style={{ '--l': '-4%', '--t': '14%', '--w': '210px' } as React.CSSProperties}
        >
          <svg
            className={`${styles.shape} ${styles.breathe}`}
            viewBox="0 0 100 100"
            style={{ '--c': 'var(--blossom)', '--o': 0.22, '--dur': '18s', '--r': '0deg' } as React.CSSProperties}
          >
            <use href="#join-ring" />
          </svg>
        </span>
        <span
          className={styles.shapeWrap}
          style={{ '--l': '82%', '--t': '68%', '--w': '130px' } as React.CSSProperties}
        >
          <svg
            className={`${styles.shape} ${styles.spin}`}
            viewBox="0 0 24 24"
            style={{ '--c': 'var(--zest)', '--o': 0.24, '--dur': '26s', '--r': '0deg' } as React.CSSProperties}
          >
            <use href="#join-spark" />
          </svg>
        </span>
        <span
          className={styles.shapeWrap}
          style={{ '--l': '4%', '--t': '76%', '--w': '280px' } as React.CSSProperties}
        >
          <svg
            className={`${styles.shape} ${styles.drift}`}
            viewBox="0 0 100 100"
            style={{ '--c': 'var(--cream)', '--o': 0.12, '--dur': '24s', '--r': '-10deg' } as React.CSSProperties}
          >
            <use href="#join-blob" />
          </svg>
        </span>
      </div>
    </>
  );
}

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [event, setEvent] = useState<GalaEvent | null>(null);

  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');

  // Default the nickname to the account Name once (still editable before joining).
  // TODO(backend): profile name from the auth user (Supabase user_metadata.name).
  const account = useAccount();
  const nicknamePrefilled = useRef(false);
  useEffect(() => {
    if (nicknamePrefilled.current || !account.name) return;
    nicknamePrefilled.current = true;
    setNickname((current) => current || account.name.slice(0, 20));
  }, [account.name]);

  const [codeError, setCodeError] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [codeShake, setCodeShake] = useState(false);
  const [nicknameShake, setNicknameShake] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const step1HeadingRef = useRef<HTMLHeadingElement>(null);
  const step2HeadingRef = useRef<HTMLHeadingElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);
  const sparkleId = useRef(0);

  // Focus management when transitioning between steps or completing the flow
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isSuccess && successHeadingRef.current) {
      successHeadingRef.current.focus();
    } else if (step === 2 && step2HeadingRef.current) {
      step2HeadingRef.current.focus();
    } else if (step === 1 && step1HeadingRef.current) {
      step1HeadingRef.current.focus();
    }
  }, [step, isSuccess]);

  const triggerSparkles = () => {
    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i * (Math.PI * 2)) / 8 + (Math.random() * 0.4 - 0.2);
      const dist = 48 + Math.random() * 24;
      newSparkles.push({
        id: sparkleId.current++,
        tx: `${Math.cos(angle) * dist}px`,
        ty: `${Math.sin(angle) * dist}px`,
      });
    }
    setSparkles(newSparkles);
    setTimeout(() => {
      setSparkles([]);
    }, 850);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase());
    if (codeError) setCodeError('');
  };

  const handleCodeBlur = () => {
    if (code) {
      setCode(normalizeGalaCode(code));
    }
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    if (nicknameError) setNicknameError('');
  };

  // Step 1: Submit code to look up gala details
  const handleStep1Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const normalized = normalizeGalaCode(code);
    setCode(normalized);

    if (!isValidCode(normalized)) {
      setCodeError('Enter the full code, like OTW-7K2P-ABCD.');
      setCodeShake(true);
      setTimeout(() => setCodeShake(false), 400);
      codeInputRef.current?.focus();
      return;
    }

    setCodeError('');
    setIsSubmitting(true);

    try {
      const result = await lookupGala(normalized);

      if (!result.ok) {
        setCodeError(
          result.error === 'ROOM_FULL'
            ? 'This gala is already full.'
            : result.error === 'OTHER'
              ? (result.message ?? 'Something went wrong. Try again.')
              : "Hmm, we can't find that code. Check your group chat and try again."
        );
        setCodeShake(true);
        setTimeout(() => setCodeShake(false), 400);
        codeInputRef.current?.focus();
        return;
      }

      setEvent(result.event);
      setStep(2);
    } catch {
      setCodeError("Hmm, we can't find that code. Check your group chat and try again.");
      setCodeShake(true);
      setTimeout(() => setCodeShake(false), 400);
      codeInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Submit nickname and complete joining
  const handleStep2Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedNick = nickname.trim();
    if (trimmedNick.length < 2 || trimmedNick.length > 20) {
      setNicknameError('Add a nickname (at least 2 characters).');
      setNicknameShake(true);
      setTimeout(() => setNicknameShake(false), 400);
      nicknameInputRef.current?.focus();
      return;
    }

    setNicknameError('');
    setIsSubmitting(true);

    try {
      const result = await joinGala({
        code: normalizeGalaCode(code),
        nickname: trimmedNick,
      });

      if (!result.ok) {
        if (result.error === 'NOT_FOUND') {
          setStep(1);
          setCodeError("Hmm, we can't find that code. Check your group chat and try again.");
        } else if (result.error === 'ALREADY_A_MEMBER') {
          // Already in this gala on this device: open it (or re-enter if the id was lost).
          const c = normalizeGalaCode(code);
          router.push(roomIdFor(c) ? MEMBER_DASHBOARD_ROUTE(c) : `/enter?code=${encodeURIComponent(c)}`);
        } else if (result.error === 'DUPLICATE_NICKNAME') {
          setNicknameError('Someone in this gala already uses that nickname. Pick another one.');
        } else if (result.error === 'ROOM_FULL') {
          setNicknameError('This gala is already full.');
        } else if (result.error === 'OTHER') {
          setNicknameError(result.message ?? 'Something went wrong. Try again.');
        } else {
          setNicknameError('Add a nickname (at least 2 characters).');
        }
        return;
      }

      // Store joined gala details for session retrieval
      try {
        sessionStorage.setItem(
          'otw_joined_gala',
          JSON.stringify({ code: normalizeGalaCode(code), nickname: trimmedNick })
        );
      } catch {
        // Fallback gracefully if sessionStorage is unavailable
      }

      setIsSuccess(true);

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion) {
        triggerSparkles();
      }
    } catch {
      setNicknameError('Something went wrong. Please try again.');
      setNicknameShake(true);
      setTimeout(() => setNicknameShake(false), 400);
      nicknameInputRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Return to Step 1 without clearing the entered code
  const handleBackToStep1 = () => {
    setStep(1);
    setNicknameError('');
  };

  const isTealBackground = step === 1 && !isSuccess;

  return (
    <main className={`${styles.joinRoot} ${isTealBackground ? styles.bgTeal : styles.bgRosy}`}>
      <BackgroundShapes />

      {/* OTW Logo header */}
      <div className={styles.logoWrap}>
        <Link href="/" className={styles.logoLink} aria-label="Go to home">
          <div className={styles.logoBox}>
            <Image
              src="/otw-logo.svg"
              alt="OTW logo"
              width={1500}
              height={1027}
              className={styles.logoImg}
              priority
            />
          </div>
        </Link>
      </div>

      <div className={`${styles.card} ${isTealBackground ? styles.cardTeal : styles.cardRosy}`}>
        {isSuccess ? (
          /* Success Screen */
          <div className={styles.successCard}>
            <div className={styles.checkBlobWrap}>
              <div className={styles.checkBlob}>
                <svg
                  viewBox="0 0 24 24"
                  width="36"
                  height="36"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              {sparkles.map((s) => (
                <span
                  key={s.id}
                  className={styles.sparklePop}
                  style={
                    {
                      '--tx': s.tx,
                      '--ty': s.ty,
                    } as React.CSSProperties
                  }
                  aria-hidden="true"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" />
                  </svg>
                </span>
              ))}
            </div>

            <h1
              ref={successHeadingRef}
              tabIndex={-1}
              className={styles.successHeading}
            >
              You&apos;re in. See you at the gala.
            </h1>

            <div className={styles.chip} role="status">
              <span>{normalizeGalaCode(code)}</span>
              <span>•</span>
              <span>{nickname.trim()}</span>
            </div>

            <Link href={MEMBER_DASHBOARD_ROUTE(normalizeGalaCode(code))} className={styles.btnSuccess}>
              Go to the Gala
            </Link>
          </div>
        ) : step === 1 ? (
          /* Step 1: Enter Gala Code */
          <div className={styles.stepContent}>
            <div className={styles.badge}>
              <svg width="12" height="12" viewBox="0 0 24 24" className={styles.badgeIcon} aria-hidden="true">
                <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" />
              </svg>
              <span>ONE ACCOUNT, KAHIT ILANG GALA</span>
            </div>

            <h1 ref={step1HeadingRef} tabIndex={-1} className={styles.heading}>
              Got a code? Let&apos;s go.
            </h1>
            <p className={styles.subCopy}>
              Type the gala code from your group chat and pick a nickname para makilala ka ng tropa.
            </p>

            <form onSubmit={handleStep1Submit} noValidate className={styles.form}>
              <div className={styles.fieldGroup}>
                <label htmlFor="gala-code" className={styles.label}>
                  Gala code
                </label>
                <input
                  ref={codeInputRef}
                  id="gala-code"
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  onBlur={handleCodeBlur}
                  placeholder="Enter gala code"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!codeError}
                  aria-describedby={codeError ? 'gala-code-error' : 'gala-code-hint'}
                  disabled={isSubmitting}
                  className={`${styles.codeInput} ${codeShake ? styles.inputError : ''}`}
                />
                {codeError ? (
                  <div id="gala-code-error" role="alert" className={styles.errorText}>
                    {codeError}
                  </div>
                ) : (
                  <div id="gala-code-hint" className={styles.hint}>
                    Looks like OTW-7K2P-ABCD
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.btnPrimary}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className={styles.spinner}
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" strokeOpacity="0.25" stroke="currentColor" />
                      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" />
                    </svg>
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>

              <div className={styles.secondaryLinkWrap}>
                <span>Want to start your own?</span>
                <Link href="/plan" className={styles.planLink}>
                  Plan a Gala
                </Link>
              </div>
            </form>
          </div>
        ) : (
          /* Step 2: Confirm and Nickname */
          <div className={styles.stepContent}>
            <h1 ref={step2HeadingRef} tabIndex={-1} className={`${styles.heading} ${styles.headingRosy}`}>
              Is this the one?
            </h1>

            {/* Event Details Card */}
            {event && (
              <div className={styles.eventCard}>
                <h2 className={styles.eventName}>{event.name}</h2>
                <div className={styles.eventMetaRow}>
                  <div className={styles.eventMetaItem}>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{event.dateRange}</span>
                  </div>
                  <div className={styles.eventMetaItem}>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{event.location}</span>
                  </div>
                </div>

                <div className={styles.attendeesWrap}>
                  <div className={styles.attendeesHeader}>
                    <span>Who&apos;s going</span>
                    <span>{event.attendeeCount} people</span>
                  </div>
                  <div className={styles.attendeeChips}>
                    {event.attendees.map((attendee, idx) => {
                      const chipClass = styles[`chipColor${idx % 5}`];
                      return (
                        <span key={attendee} className={`${styles.attendeeChip} ${chipClass}`}>
                          {attendee}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleStep2Submit} noValidate className={styles.form}>
              <div className={styles.fieldGroup}>
                <label htmlFor="nickname" className={styles.label}>
                  What should we call you?
                </label>
                <input
                  ref={nicknameInputRef}
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={handleNicknameChange}
                  placeholder="e.g. Josh"
                  maxLength={20}
                  aria-invalid={!!nicknameError}
                  aria-describedby={nicknameError ? 'nickname-error' : 'nickname-hint'}
                  disabled={isSubmitting}
                  className={`${styles.nicknameInput} ${nicknameShake ? styles.inputError : ''}`}
                />
                {nicknameError ? (
                  <div id="nickname-error" role="alert" className={styles.errorText}>
                    {nicknameError}
                  </div>
                ) : (
                  <div id="nickname-hint" className={styles.hint}>
                    This is how your friends will see you.
                  </div>
                )}
              </div>

              <div className={styles.step2Actions}>
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  disabled={isSubmitting}
                  className={styles.btnBack}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.btnJoin}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className={styles.spinner}
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="9" strokeOpacity="0.25" stroke="currentColor" />
                        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" />
                      </svg>
                      <span>Joining...</span>
                    </>
                  ) : (
                    <span>Join the Gala</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}