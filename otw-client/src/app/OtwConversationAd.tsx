'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import styles from './OtwConversationAd.module.css';

/* ---------- content ---------- */

type Msg =
  | { t: 'msg'; w: 0 | 1; text: string } // w: 0 = planner (left), 1 = friend (right)
  | { t: 'gap'; text: string }
  | { t: 'action'; text: string }
  | { t: 'link'; url: string };

interface Pair {
  names: [string, string];
  without: Msg[];
  with: Msg[];
}

const PAIRS: Pair[] = [
  {
    names: ['Mia', 'Josh'],
    without: [
      { t: 'msg', w: 0, text: 'G tayo?' },
      { t: 'msg', w: 1, text: 'G!' },
      { t: 'msg', w: 0, text: 'Kailan?' },
      { t: 'msg', w: 1, text: 'Set na' },
      { t: 'gap', text: '3 weeks later...' },
      { t: 'msg', w: 0, text: 'Drawing naman!' },
    ],
    with: [
      { t: 'msg', w: 0, text: 'G tayo?' },
      { t: 'msg', w: 1, text: 'G!' },
      { t: 'msg', w: 0, text: 'Kailan?' },
      { t: 'msg', w: 1, text: 'Saturday.' },
      { t: 'action', text: 'sends gala link' },
      { t: 'link', url: 'otw.app/g/7K2P' },
    ],
  },
  {
    names: ['Kat', 'Migs'],
    without: [
      { t: 'msg', w: 0, text: 'Tara Tagaytay?' },
      { t: 'msg', w: 1, text: 'Sige sige' },
      { t: 'msg', w: 0, text: 'Anong date?' },
      { t: 'msg', w: 1, text: 'Basta soon' },
      { t: 'gap', text: '2 months later...' },
      { t: 'msg', w: 0, text: 'Drawing naman!' },
    ],
    with: [
      { t: 'msg', w: 0, text: 'Tara Tagaytay?' },
      { t: 'msg', w: 1, text: 'Sige!' },
      { t: 'msg', w: 0, text: 'Anong date?' },
      { t: 'msg', w: 1, text: 'Sunday.' },
      { t: 'action', text: 'sends gala link' },
      { t: 'link', url: 'otw.app/g/4M9X' },
    ],
  },
  {
    names: ['Ana', 'Paolo'],
    without: [
      { t: 'msg', w: 0, text: 'Beach tayo?' },
      { t: 'msg', w: 1, text: 'G na G!' },
      { t: 'msg', w: 0, text: 'Sino may sasakyan?' },
      { t: 'msg', w: 1, text: 'Ako bahala' },
      { t: 'gap', text: '1 month later...' },
      { t: 'msg', w: 0, text: 'Drawing naman!' },
    ],
    with: [
      { t: 'msg', w: 0, text: 'Beach tayo?' },
      { t: 'msg', w: 1, text: 'G na G!' },
      { t: 'msg', w: 0, text: 'Sino may sasakyan?' },
      { t: 'msg', w: 1, text: 'Ako, Friday.' },
      { t: 'action', text: 'sends gala link' },
      { t: 'link', url: 'otw.app/g/2B8Q' },
    ],
  },
];

const DWELL_MS = 5400; // Tagal bago kusa mag-advance sa next card

const cssVars = (v: Record<string, string | number>) => v as React.CSSProperties;

/* React subscription para sa prefers-reduced-motion nang walang cascading renders */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', callback);
      return () => mq.removeEventListener('change', callback);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );
}

/* ---------- one chat card ---------- */

interface CardProps {
  variant: 'without' | 'with';
  step: number;
  moved: boolean;
  onNext: () => void;
}

function ChatCard({ variant, step, moved, onNext }: CardProps) {
  const isWith = variant === 'with';
  const front = isWith ? step % 2 === 1 : step % 2 === 0;
  const pair = PAIRS[Math.floor(step / 2) % PAIRS.length];
  const msgs = isWith ? pair.with : pair.without;
  const label = isWith ? 'WITH OTW' : 'WITHOUT OTW';

  const lastFront = front ? step : step - 1;
  const playKey = lastFront < 0 ? 'init' : lastFront;

  const cls = [
    styles.card,
    isWith ? styles.cardWith : styles.cardWithout,
    front ? styles.front : styles.back,
    moved ? (front ? styles.toFront : styles.toBack) : '',
  ].join(' ');

  return (
    <article
      className={cls}
      style={{
        ...cssVars({ '--d': isWith ? 1 : -1 }),
        cursor: 'pointer', // Pinapakita na pwedeng i-click kahit saan sa card
      }}
      role="button"
      tabIndex={0}
      aria-label={`Show next conversation. Currently showing ${label}`}
      onClick={onNext}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNext();
        }
      }}
    >
      <React.Fragment key={playKey}>
        <span className={styles.badge} aria-hidden="true">
          {isWith ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--teal-dark)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cream)" strokeWidth="3.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          )}
        </span>

        <header className={styles.head}>{label}</header>

        <div className={styles.body}>
          {msgs.map((m, i) => {
            const itemStyle = cssVars({ '--i': i });

            if (m.t === 'gap') {
              return (
                <div key={i} className={`${styles.item} ${styles.gap}`} style={itemStyle}>
                  <span>{m.text}</span>
                </div>
              );
            }

            if (m.t === 'action') {
              return (
                <p key={i} className={`${styles.item} ${styles.action}`} style={itemStyle}>
                  <strong>{pair.names[0]}:</strong> {m.text}
                </p>
              );
            }

            if (m.t === 'link') {
              return (
                <div key={i} className={`${styles.item} ${styles.linkRow}`} style={itemStyle}>
                  <div className={styles.linkBubble}>
                    <span className={styles.linkIcon}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rosy)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
                        <circle cx="12" cy="9" r="2.4" />
                      </svg>
                    </span>
                    <span className={styles.linkUrl}>{m.url}</span>
                  </div>
                </div>
              );
            }

            const isFriend = m.w === 1;
            const isDrawing = !isWith && i === msgs.length - 1;
            return (
              <div
                key={i}
                className={`${styles.item} ${styles.row} ${isFriend ? styles.rowRight : styles.rowLeft} ${isDrawing ? styles.fizzle : ''}`}
                style={itemStyle}
              >
                <span className={`${styles.avatar} ${isFriend ? styles.avTeal : styles.avRosy}`} aria-hidden="true">
                  {pair.names[m.w][0]}
                </span>
                <div className={styles.msgCol}>
                  <span className={styles.name}>{pair.names[m.w]}</span>
                  <div className={`${styles.bubble} ${isFriend ? styles.bubbleFriend : styles.bubblePlanner}`}>{m.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </React.Fragment>
    </article>
  );
}

/* ---------- the deck ---------- */

export default function OtwConversationAd() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [moved, setMoved] = useState(false);
  const [inView, setInView] = useState(true);

  const reduce = usePrefersReducedMotion();

  // Hihinto lang kung wala sa screen / viewport (para sa performance)
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Tuloy-tuloy na auto-advance (hindi na apektado ng cursor/mouse hover)
  useEffect(() => {
    if (reduce || !inView) return;

    const timer = setTimeout(() => {
      setMoved(true);
      setStep((s) => s + 1);
    }, DWELL_MS);

    return () => clearTimeout(timer);
  }, [step, reduce, inView]);

  // Handler para sa manual click (agad na lilipat sa susunod)
  const handleNext = () => {
    setMoved(true);
    setStep((s) => s + 1);
  };

  const goTo = (to: number) => {
    setMoved(true);
    setStep(to);
  };

  const pairIdx = Math.floor(step / 2) % PAIRS.length;

  return (
    <div
      ref={rootRef}
      className={styles.root}
      role="region"
      aria-label="Group chat without OTW versus with OTW"
    >
      <div className={styles.stack}>
        {/* Parehong may onNext handler para kahit alin ang i-click, mag-aabante agad */}
        <ChatCard variant="without" step={step} moved={moved} onNext={handleNext} />
        <ChatCard variant="with" step={step} moved={moved} onNext={handleNext} />
      </div>

      <div className={styles.dots} role="group" aria-label="Choose a conversation">
        {PAIRS.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.dot} ${i === pairIdx ? styles.dotActive : ''}`}
            aria-label={`Show conversation ${i + 1}`}
            aria-current={i === pairIdx}
            onClick={() => goTo(i * 2)}
          />
        ))}
      </div>
    </div>
  );
}