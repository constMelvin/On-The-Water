'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './code-confirm.module.css';

// Dashboard routes constants
export const LEADER_DASHBOARD_ROUTE = '/dashboard';
export const CREATE_ACCOUNT_ROUTE = '/signup';

interface SparkleParticle {
  id: number;
  tx: string;
  ty: string;
  left: string;
  top: string;
}

function CodeConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const headingRef = useRef<HTMLHeadingElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shareTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const passwordCopyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copyCodeFailed, setCopyCodeFailed] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAccountCard, setShowAccountCard] = useState(true);
  const [savedPassword, setSavedPassword] = useState('');
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);

  // If there is no code param, redirect to /plan and render nothing
  useEffect(() => {
    if (!code) {
      router.replace('/plan');
    }
  }, [code, router]);

  // Read saved password from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('otw:gala-password');
      if (stored) {
        setSavedPassword(stored);
      }
    }
  }, []);

  // Focus the <h1> on mount
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      if (passwordCopyTimeoutRef.current) clearTimeout(passwordCopyTimeoutRef.current);
    };
  }, []);

  // Trigger sparkle animation
  const triggerSparkles = () => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const count = 6;
    const newSparkles: SparkleParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = 35 + Math.random() * 25;
      newSparkles.push({
        id: Date.now() + i,
        tx: `${Math.cos(angle) * distance}px`,
        ty: `${Math.sin(angle) * distance}px`,
        left: '50%',
        top: '50%',
      });
    }

    setSparkles(newSparkles);
    setTimeout(() => {
      setSparkles([]);
    }, 700);
  };

  // Copy Gala Code handler
  const handleCopyCode = async () => {
    if (!code) return;
    setCopyCodeFailed(false);

    let success = false;

    // 1. Try Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(code);
        success = true;
      } catch {
        success = false;
      }
    }

    // 2. Fallback to hidden textarea + execCommand
    if (!success) {
      try {
        if (textareaRef.current) {
          textareaRef.current.value = code;
          textareaRef.current.select();
          success = document.execCommand('copy');
        }
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopiedCode(true);
      setCopyCodeFailed(false);
      setSrAnnouncement('Copied');
      triggerSparkles();

      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedCode(false);
        setSrAnnouncement('');
      }, 2000);
    } else {
      // Both failed: show fallback message and select code
      setCopyCodeFailed(true);
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }
  };

  // Share Gala handler
  const handleShareGala = async () => {
    if (!code) return;
    const shareText = `Join my gala on OTW! Gala Code: ${code}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'OTW Gala',
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard if share was cancelled or failed
      }
    }

    // Clipboard fallback
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else if (textareaRef.current) {
        textareaRef.current.value = shareText;
        textareaRef.current.select();
        document.execCommand('copy');
      }
      setShareFeedback('Invite copied!');
      setSrAnnouncement('Invite copied');
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = setTimeout(() => {
        setShareFeedback('');
        setSrAnnouncement('');
      }, 2000);
    } catch {
      setShareFeedback('Copy invite manually');
    }
  };

  // Copy Password handler
  const handleCopyPassword = async () => {
    if (!savedPassword) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(savedPassword);
      } else if (textareaRef.current) {
        textareaRef.current.value = savedPassword;
        textareaRef.current.select();
        document.execCommand('copy');
      }
      setPasswordCopied(true);
      if (passwordCopyTimeoutRef.current) clearTimeout(passwordCopyTimeoutRef.current);
      passwordCopyTimeoutRef.current = setTimeout(() => {
        setPasswordCopied(false);
      }, 2000);
    } catch {
      // Silently ignore or select
    }
  };

  if (!code) {
    return null;
  }

  return (
    <main className={styles.confirmPage}>
      {/* 3 large floating background shapes */}
      <div className={styles.bgShapes} aria-hidden="true">
        <svg
          className={`${styles.floatingShape} ${styles.shapeSparkle}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
        </svg>

        <svg
          className={`${styles.floatingShape} ${styles.shapeRing}`}
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
        >
          <circle cx="50" cy="50" r="40" />
        </svg>

        <svg
          className={`${styles.floatingShape} ${styles.shapeBlob}`}
          viewBox="0 0 100 100"
        >
          <path d="M52 4C78 2 98 22 96 50c-2 30-24 48-50 46C20 94 2 74 5 48 8 24 28 6 52 4Z" />
        </svg>
      </div>

      <div className={styles.contentContainer}>
        {/* Header: Original wordmark top-left, X top-right linking to "/" */}
        <header className={styles.header}>
          <Link href="/" className={styles.wordmarkLink} aria-label="OTW home">
            <svg
              className={styles.wordmarkPin}
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
            <span className={styles.wordmarkText}>OTW</span>
          </Link>

          <Link href="/" className={styles.closeBtn} aria-label="Close and return home">
            <svg
              className={styles.closeIcon}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Link>
        </header>

        {/* Two columns on desktop, stacked on mobile */}
        <div className={styles.columnsGrid}>
          {/* ======================================================== */}
          {/* LEFT COLUMN                                              */}
          {/* ======================================================== */}
          <div className={styles.leftColumn}>
            {/* Zest blob (~120px) with rosy sun/burst SVG icon */}
            <div className={`${styles.zestBlob} ${styles.popInBlob}`} aria-hidden="true">
              <svg className={styles.sunBurstIcon} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
              Okay, this is happening.
            </h1>
            <p className={styles.subCopy}>
              Your gala is ready. Share the code with your friends so they can jump in.
            </p>

            {/* Dashed ticket box */}
            <div className={`${styles.ticketBox} ${styles.popInTicket}`}>
              <span className={styles.ticketLabel}>Gala Code</span>
              <span className={styles.ticketCode}>{code}</span>

              <div className={styles.ticketButtonsRow}>
                <div className={styles.copyWrap}>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={styles.copyBtn}
                    id="copyGalaCodeBtn"
                  >
                    {copiedCode ? (
                      <>
                        <svg
                          className={styles.btnSvgIcon}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className={styles.btnSvgIcon}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy Gala Code</span>
                      </>
                    )}
                  </button>

                  {/* Sparkle burst particles */}
                  {sparkles.map((s) => (
                    <span
                      key={s.id}
                      className={styles.sparklePop}
                      style={
                        {
                          left: s.left,
                          top: s.top,
                          '--tx': s.tx,
                          '--ty': s.ty,
                        } as React.CSSProperties
                      }
                      aria-hidden="true"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
                      </svg>
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleShareGala}
                  className={styles.shareBtn}
                  id="shareGalaBtn"
                >
                  <svg
                    className={styles.btnSvgIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span>{shareFeedback || 'Share Gala'}</span>
                </button>
              </div>

              {copyCodeFailed && (
                <p className={styles.copyNotice} role="alert">
                  Press Ctrl/Cmd+C to copy
                </p>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN                                             */}
          {/* ======================================================== */}
          <div className={styles.rightColumn}>
            {/* Cream Gala Password card */}
            <div className={`${styles.passwordCard} ${styles.popInPassword}`}>
              <div className={styles.passwordCardHeader}>
                <div className={styles.passwordLabelGroup}>
                  <div className={styles.lockIconBadge} aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <span className={styles.passwordCardTitle}>Gala Password</span>
                </div>

                <div className={styles.passwordActions}>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className={styles.iconActionBtn}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className={styles.iconActionBtn}
                    aria-label="Copy password"
                  >
                    {passwordCopied ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className={styles.passwordDisplayBox}>
                {savedPassword
                  ? showPassword
                    ? savedPassword
                    : '•'.repeat(Math.max(savedPassword.length, 8))
                  : '••••••••'}
              </div>
            </div>

            <p className={styles.passwordUnderText}>
              Share the Gala Code with your friends. Keep the Gala Password somewhere safe so you can come back later.
            </p>

            {/* Cream Account Card */}
            {showAccountCard && (
              <div className={`${styles.accountCard} ${styles.popInAccount}`}>
                <h2 className={styles.accountTitle}>Want to keep your gala with you?</h2>
                <p className={styles.accountCopy}>
                  Create an account to save your galas, keep a personal calendar, view your gala history, and get reminders.
                </p>

                <div className={styles.accountButtonsRow}>
                  <Link href={CREATE_ACCOUNT_ROUTE} className={styles.createAccountBtn}>
                    Create an Account
                  </Link>

                  <button
                    type="button"
                    onClick={() => setShowAccountCard(false)}
                    className={styles.maybeLaterBtn}
                  >
                    Maybe Later
                  </button>
                </div>

                <p className={styles.accountSmallNote}>
                  Your current gala can still continue without an account.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM CENTER: "Enter the Gala" */}
        <div className={styles.bottomCenterRow}>
          <button
            type="button"
            onClick={() => router.push(LEADER_DASHBOARD_ROUTE)}
            className={styles.enterGalaBtn}
            id="enterGalaBtn"
          >
            Enter the Gala
          </button>
        </div>

        {/* Hidden textarea for copy fallbacks */}
        <textarea
          ref={textareaRef}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className={styles.hiddenTextarea}
        />

        {/* Screen reader live region */}
        <div className={styles.srOnly} aria-live="polite" role="status">
          {srAnnouncement}
        </div>
      </div>
    </main>
  );
}

export default function CodeConfirmPage() {
  return (
    <Suspense fallback={null}>
      <CodeConfirmContent />
    </Suspense>
  );
}
