'use client';

import { useEffect, useState } from 'react';
import styles from './IntroSplash.module.css';

/* Plays once per full page load; client-side navigations back to "/" skip it. */
let played = false;

function Stage() {
  return (
    <div className={styles.stage}>
      <span className={`${styles.blob} ${styles.b1}`} />
      <span className={`${styles.blob} ${styles.b2}`} />
      <h1 className={styles.giant}>
        <span className={styles.g}>G</span> <span className={styles.na}>na?</span>
      </h1>
      <span className={styles.road} />
    </div>
  );
}

function Car() {
  return (
    <div className={styles.car}>
      <svg viewBox="0 0 250 112" className={styles.carSvg} focusable="false">
        <g className={styles.speed} stroke="#fff8f2" strokeWidth="5" strokeLinecap="round" opacity="0.8">
          <path d="M-30 52h28M-42 68h40M-24 84h22" />
        </g>
        <path
          d="M12 72Q12 54 32 52L64 50Q78 26 102 24H152Q174 26 188 50L218 54Q238 58 238 74V80Q238 86 232 86H18Q12 86 12 80Z"
          fill="#f8e140"
          stroke="#1f6376"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M80 50Q90 34 106 34H126V50Z M136 34H152Q164 36 172 50H136Z" fill="#fff8f2" stroke="#1f6376" strokeWidth="4" strokeLinejoin="round" />
        <text x="118" y="74" textAnchor="middle" fontFamily="var(--font-fredoka), Fredoka, sans-serif" fontWeight="700" fontSize="19" fill="#1f6376">
          OTW
        </text>
        <circle cx="228" cy="64" r="5" fill="#fff8f2" stroke="#1f6376" strokeWidth="3" />
        {[64, 182].map((cx) => (
          <g key={cx} className={styles.wheel} style={{ transformOrigin: `${cx}px 88px` }}>
            <circle cx={cx} cy="88" r="21" fill="#1f6376" />
            <circle cx={cx} cy="88" r="9" fill="#fff8f2" />
            <path d={`M${cx} 70v36M${cx - 18} 88h36`} stroke="#fff8f2" strokeWidth="3" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function IntroSplash() {
  const [show, setShow] = useState(() => !played);

  useEffect(() => {
    if (!show) return;
    played = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = setTimeout(() => setShow(false), 0);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    const done = setTimeout(() => setShow(false), 3300);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShow(false);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(done);
      window.removeEventListener('keydown', onKey);
      html.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className={styles.splash} aria-hidden="true" onPointerDown={() => setShow(false)}>
      <div className={`${styles.half} ${styles.left}`}>
        <Stage />
      </div>
      <div className={`${styles.half} ${styles.right}`}>
        <Stage />
      </div>
      <Car />
    </div>
  );
}
