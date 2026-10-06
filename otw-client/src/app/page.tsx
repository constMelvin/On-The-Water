'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css';
import OtwConversationAd from './OtwConversationAd';
import { useAccount } from '@/lib/auth/session';
import { useLogOut } from '@/components/gala/useLogOut';

interface Sparkle {
  id: number;
  tx: string;
  ty: string;
  left: string;
  top: string;
}

/** Sets a per-element stagger delay consumed by the CSS (`--d`). */
const delay = (seconds: number) => ({ '--d': `${seconds}s` }) as React.CSSProperties;

// Official React hook to check client mount without triggering cascading renders
const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/* ------------------------------------------------------------------ */
/*  Living background: big, low-opacity shapes taken from the logo    */
/*  (sparkles, bean blobs, noodle loop, pills, bursts) + soft glows.  */
/*  Brand color tokens only.                                          */
/* ------------------------------------------------------------------ */

type Tone = 'rosy' | 'rosy-dark' | 'zest' | 'zest-dark' | 'blossom' | 'teal' | 'teal-dark' | 'cream';
type Kind = 'spark' | 'blob' | 'noodle' | 'pill' | 'ring' | 'squiggle' | 'burst' | 'dot' | 'glow';
type Motion = 'drift' | 'breathe' | 'spin' | 'sway' | 'twinkle' | 'rise';

interface ShapeDef {
  k: Kind;
  l: string; // left
  t: string; // top
  w: number; // width in px
  c: Tone;
  o: number; // opacity
  r?: number; // base rotation (deg)
  a?: Motion; // idle motion
  dur?: number; // seconds
  dl?: number; // delay seconds (negative = already mid-animation)
  z?: number; // pointer-parallax depth in px
}

const S = (k: Kind, l: string, t: string, w: number, c: Tone, o: number, x: Partial<ShapeDef> = {}): ShapeDef => ({
  k,
  l,
  t,
  w,
  c,
  o,
  ...x,
});

const VIEWBOX: Record<Exclude<Kind, 'glow'>, string> = {
  spark: '0 0 24 24',
  blob: '0 0 100 100',
  noodle: '0 0 120 120',
  pill: '0 0 160 70',
  ring: '0 0 100 100',
  squiggle: '0 0 160 40',
  burst: '0 0 100 100',
  dot: '0 0 10 10',
};

const HERO_SHAPES: ShapeDef[] = [
  S('glow', '52%', '-14%', 560, 'zest', 0.24, { a: 'drift', dur: 20, z: 8 }),
  S('glow', '-10%', '36%', 480, 'blossom', 0.2, { a: 'drift', dur: 24, dl: -6, z: 10 }),
  S('blob', '36%', '-16%', 320, 'cream', 0.09, { a: 'drift', dur: 22, z: 18 }),
  S('blob', '68%', '56%', 360, 'rosy-dark', 0.22, { a: 'drift', dur: 26, dl: -9, z: 22 }),
  S('ring', '-3%', '-16%', 240, 'rosy-dark', 0.24, { a: 'breathe', dur: 18, z: 24 }),
  S('ring', '82%', '4%', 150, 'blossom', 0.2, { a: 'breathe', dur: 16, dl: -4, z: 30 }),
  S('noodle', '-5%', '58%', 300, 'cream', 0.1, { a: 'sway', r: -20, dur: 24, z: 26 }),
  S('spark', '3%', '12%', 120, 'cream', 0.16, { a: 'spin', dur: 30, z: 34 }),
  S('burst', '46%', '76%', 130, 'zest', 0.24, { a: 'spin', dur: 26, z: 36 }),
  S('pill', '62%', '80%', 260, 'blossom', 0.11, { a: 'sway', dur: 18, dl: -3, z: 20 }),
  S('squiggle', '18%', '88%', 210, 'cream', 0.16, { a: 'sway', dur: 14, z: 30 }),
  S('spark', '91%', '68%', 84, 'zest', 0.32, { a: 'twinkle', dur: 4, z: 44 }),
  S('spark', '30%', '9%', 36, 'cream', 0.55, { a: 'twinkle', dur: 3.4, dl: -1, z: 48 }),
  S('spark', '72%', '15%', 28, 'blossom', 0.6, { a: 'twinkle', dur: 4.2, dl: -2, z: 52 }),
  S('spark', '12%', '50%', 26, 'cream', 0.5, { a: 'twinkle', dur: 3, dl: -0.6, z: 46 }),
  S('dot', '54%', '48%', 16, 'cream', 0.45, { a: 'twinkle', dur: 3.6, dl: -2.2, z: 50 }),
];

const HOW_SHAPES: ShapeDef[] = [
  S('glow', '28%', '-24%', 600, 'cream', 0.5, { a: 'drift', dur: 22, z: 8 }),
  S('blob', '78%', '-16%', 340, 'cream', 0.24, { a: 'drift', dur: 21, z: 18 }),
  S('blob', '18%', '28%', 220, 'blossom', 0.26, { a: 'drift', dur: 25, dl: -5, z: 16 }),
  S('spark', '3%', '10%', 150, 'rosy', 0.13, { a: 'spin', dur: 28, z: 30 }),
  S('ring', '88%', '20%', 140, 'zest-dark', 0.24, { a: 'breathe', dur: 17, z: 26 }),
  S('noodle', '72%', '56%', 280, 'rosy', 0.09, { a: 'sway', r: 15, dur: 22, dl: -5, z: 24 }),
  S('pill', '-5%', '68%', 290, 'teal', 0.08, { a: 'sway', dur: 24, dl: -8, z: 20 }),
  S('burst', '12%', '74%', 120, 'rosy', 0.15, { a: 'spin', dur: 24, z: 34 }),
  S('squiggle', '40%', '90%', 220, 'teal', 0.14, { a: 'sway', dur: 15, z: 28 }),
  S('spark', '22%', '8%', 30, 'rosy', 0.42, { a: 'twinkle', dur: 3.6, z: 46 }),
  S('spark', '92%', '78%', 34, 'teal', 0.36, { a: 'twinkle', dur: 4.4, dl: -1.5, z: 50 }),
  S('spark', '52%', '12%', 24, 'cream', 0.75, { a: 'twinkle', dur: 3.2, dl: -0.8, z: 44 }),
  S('spark', '60%', '88%', 26, 'rosy', 0.32, { a: 'twinkle', dur: 4, dl: -2.6, z: 48 }),
];

const FEATURE_SHAPES: ShapeDef[] = [
  S('glow', '-10%', '-12%', 520, 'blossom', 0.3, { a: 'drift', dur: 22, z: 8 }),
  S('glow', '74%', '52%', 500, 'zest', 0.18, { a: 'drift', dur: 26, dl: -7, z: 10 }),
  S('blob', '64%', '-20%', 380, 'teal-dark', 0.3, { a: 'drift', dur: 24, z: 16 }),
  S('blob', '-6%', '-10%', 320, 'blossom', 0.12, { a: 'drift', dur: 20, dl: -3, z: 18 }),
  S('spark', '90%', '8%', 170, 'zest', 0.18, { a: 'spin', dur: 28, z: 32 }),
  S('burst', '8%', '14%', 130, 'blossom', 0.22, { a: 'spin', dur: 24, z: 36 }),
  S('ring', '50%', '-10%', 150, 'cream', 0.14, { a: 'breathe', dur: 17, z: 26 }),
  S('noodle', '80%', '62%', 280, 'cream', 0.1, { a: 'sway', r: -10, dur: 23, dl: -7, z: 24 }),
  S('pill', '5%', '72%', 250, 'blossom', 0.12, { a: 'sway', dur: 17, dl: -2, z: 20 }),
  S('squiggle', '58%', '92%', 220, 'zest', 0.16, { a: 'sway', dur: 15, z: 30 }),
  S('spark', '26%', '6%', 32, 'cream', 0.6, { a: 'twinkle', dur: 3.4, z: 46 }),
  S('spark', '94%', '48%', 30, 'zest', 0.55, { a: 'twinkle', dur: 4, dl: -1.2, z: 50 }),
  S('spark', '38%', '94%', 28, 'blossom', 0.6, { a: 'twinkle', dur: 3.8, dl: -2, z: 44 }),
  S('spark', '10%', '52%', 24, 'cream', 0.55, { a: 'twinkle', dur: 3.2, dl: -0.5, z: 48 }),
];

const CTA_SHAPES: ShapeDef[] = [
  S('glow', '32%', '10%', 560, 'zest', 0.32, { a: 'drift', dur: 22, z: 8 }),
  S('blob', '-4%', '-30%', 320, 'rosy', 0.09, { a: 'drift', dur: 20, z: 18 }),
  S('spark', '86%', '8%', 170, 'zest', 0.38, { a: 'spin', dur: 28, z: 32 }),
  S('spark', '6%', '56%', 150, 'rosy', 0.12, { a: 'spin', dur: 30, dl: -4, z: 30 }),
  S('ring', '20%', '8%', 110, 'rosy', 0.16, { a: 'breathe', dur: 16, z: 26 }),
  S('burst', '70%', '8%', 110, 'teal', 0.15, { a: 'spin', dur: 24, z: 34 }),
  S('noodle', '76%', '50%', 250, 'teal', 0.09, { a: 'sway', r: 20, dur: 22, dl: -5, z: 24 }),
  S('pill', '8%', '80%', 280, 'cream', 0.42, { a: 'sway', dur: 18, z: 20 }),
  // celebration confetti rising behind the button
  S('dot', '30%', '86%', 14, 'rosy', 0.5, { a: 'rise', dur: 7, dl: 0, z: 40 }),
  S('dot', '42%', '90%', 10, 'zest-dark', 0.6, { a: 'rise', dur: 9, dl: -3, z: 44 }),
  S('dot', '56%', '88%', 16, 'teal', 0.4, { a: 'rise', dur: 8, dl: -5, z: 38 }),
  S('dot', '66%', '92%', 12, 'rosy', 0.5, { a: 'rise', dur: 10, dl: -1.5, z: 46 }),
  S('spark', '36%', '80%', 24, 'rosy', 0.5, { a: 'rise', dur: 8.5, dl: -6, z: 42 }),
  S('spark', '60%', '84%', 22, 'zest-dark', 0.6, { a: 'rise', dur: 7.5, dl: -2.5, z: 40 }),
];

const FOOTER_SHAPES: ShapeDef[] = [
  S('glow', '58%', '-70%', 520, 'teal', 0.4, { a: 'drift', dur: 22, z: 6 }),
  S('spark', '5%', '18%', 80, 'cream', 0.1, { a: 'spin', dur: 30, z: 26 }),
  S('burst', '88%', '24%', 90, 'blossom', 0.13, { a: 'spin', dur: 26, z: 30 }),
  S('ring', '20%', '58%', 70, 'blossom', 0.12, { a: 'breathe', dur: 16, z: 22 }),
  S('squiggle', '70%', '68%', 170, 'zest', 0.13, { a: 'sway', dur: 15, z: 24 }),
  S('spark', '36%', '18%', 20, 'cream', 0.5, { a: 'twinkle', dur: 3.4, z: 34 }),
  S('spark', '80%', '60%', 18, 'zest', 0.5, { a: 'twinkle', dur: 4, dl: -1.4, z: 36 }),
];

/* ------------------------------------------------------------------ */
/*  How it works: road-trip / parcel tracker                          */
/* ------------------------------------------------------------------ */

const STEPS: { t: string; d: string; icon: React.ReactNode }[] = [
  {
    t: 'Pick the date',
    d: 'Let’s turn “someday” into an actual date.',
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="4" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    t: 'See who’s G',
    d: 'I’m G, Maybe, or Can’t make it. No more “seen.”',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 19c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M15.5 10.5l2 2 3.5-4" />
      </>
    ),
  },
  {
    t: 'Build the plan',
    d: 'Places, food stops and timing, in order.',
    icon: (
      <>
        <circle cx="6" cy="18" r="2.2" />
        <circle cx="18" cy="6" r="2.2" />
        <path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" />
      </>
    ),
  },
  {
    t: 'Talk gastos',
    d: 'Estimate the budget before “magkano ba?” starts.',
    icon: (
      <>
        <rect x="3" y="6.5" width="18" height="13" rx="4" />
        <path d="M3 10.5h18" />
        <circle cx="16.5" cy="15" r="1.2" />
      </>
    ),
  },
  {
    t: 'Pack smart',
    d: 'Because someone always forgets the charger.',
    icon: (
      <>
        <rect x="4" y="8" width="16" height="12" rx="4" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2M4 13h16" />
      </>
    ),
  },
  {
    t: 'Real-time GC chat',
    d: 'Keep all the banter, updates, and side-talk in one place.',
    icon: (
      <>
        <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
        <path d="M8 10h8M8 13.5h5" />
      </>
    ),
  },
  {
    t: 'Watch everyone go OTW',
    d: 'Live location on gala day.',
    icon: (
      <>
        <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
        <circle cx="12" cy="9" r="2.4" />
      </>
    ),
  },
];

/** Winding route through the centre of every stop (viewBox 0 0 100 700, one row = 100 units). */
const ROUTE_D = `M50 0 L50 50 ${Array.from({ length: STEPS.length - 1 }, (_, i) => {
  const y = 50 + i * 100;
  const x = i % 2 ? 18 : 82;
  return `C${x} ${y + 40} ${x} ${y + 60} 50 ${y + 100}`;
}).join(' ')} L50 700`;

function RoadTracker() {
  const [active, setActive] = useState(0);
  const stopRefs = useRef<(HTMLLIElement | null)[]>([]);

  /* The OTW pin follows whichever stop sits in the middle of the viewport. */
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    stopRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const progress = ((active + 0.5) / STEPS.length) * 100;

  return (
    <>
      <p className={styles.trackStatus} aria-live="polite">
        <span className={styles.trackDot} />
        Stop {active + 1} of {STEPS.length} · {STEPS[active].t}
      </p>

      <div className={styles.road} style={{ '--p': `${progress}%` } as React.CSSProperties}>
        <div className={styles.route} aria-hidden="true">
          <svg viewBox="0 0 100 700" preserveAspectRatio="none" focusable="false">
            <path className={styles.routeBase} d={ROUTE_D} />
          </svg>
          <div className={styles.routeFillWrap}>
            <svg viewBox="0 0 100 700" preserveAspectRatio="none" focusable="false">
              <path className={styles.routeFill} d={ROUTE_D} />
            </svg>
          </div>
          <div className={styles.van} style={{ top: `${progress}%` }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 16V9.5A2.5 2.5 0 0 1 5.5 7H14l4 4h1.5A1.5 1.5 0 0 1 21 12.5V16h-2M9 16h6M5 16H3M14 7v4h4" />
              <circle cx="7" cy="16.5" r="1.8" />
              <circle cx="17" cy="16.5" r="1.8" />
            </svg>
            <span>OTW</span>
          </div>
        </div>

        <ol className={styles.stops}>
        {STEPS.map((s, i) => {
          const state = i < active ? styles.done : i === active ? styles.here : '';
          return (
            <li
              key={s.t}
              ref={(el) => {
                stopRefs.current[i] = el;
              }}
              data-i={i}
              className={`${styles.stop} ${i % 2 ? styles.stopRight : styles.stopLeft} ${state}`}
            >
              <button
                type="button"
                className={styles.milestone}
                onClick={() => setActive(i)}
                aria-label={`Stop ${i + 1}: ${s.t}`}
                aria-current={i === active ? 'step' : undefined}
              >
                {i + 1}
              </button>
              <div className={styles.stopCard} data-reveal style={delay(0.05)} onClick={() => setActive(i)}>
                <span className={styles.stopIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {s.icon}
                  </svg>
                </span>
                <div>
                  <span className={styles.stopEyebrow}>STOP {String(i + 1).padStart(2, '0')}</span>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </div>
            </li>
          );
        })}
        </ol>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Features: no account vs. account fork                             */
/* ------------------------------------------------------------------ */

const NOW_ITEMS = [
  'Plan a Gala or join with a code',
  'Attendance, itinerary, checklist',
  'Budget, expenses, chat',
  'Live location on gala day',
  'The Gala Dump for photos',
];

const LATER_ITEMS = [
  'Saved galas, one tap away',
  'A personal gala calendar',
  'Gala history, plus Mga Drawing',
  'Reminders, even when you’re not in the gala',
  'Your galas on any device',
];

/** Playful pointer tilt, written as two CSS variables. Mouse only. */
const tilt = (e: React.PointerEvent<HTMLElement>) => {
  if (e.pointerType !== 'mouse') return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -8}deg`);
  e.currentTarget.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
};

const untilt = (e: React.PointerEvent<HTMLElement>) => {
  e.currentTarget.style.removeProperty('--rx');
  e.currentTarget.style.removeProperty('--ry');
};

function ForkCards() {
  return (
    <div className={styles.fork}>
      <article
        className={`${styles.forkCard} ${styles.forkNow}`}
        data-reveal
        style={delay(0.1)}
        onPointerMove={tilt}
        onPointerLeave={untilt}
      >
        <span className={styles.forkTag}>ONE ACCOUNT, KAHIT ILANG GALA</span>
        <h3>Account muna. Tapos G na.</h3>
        <p className={styles.forkSub}>
          Gumawa ng account para ma-save ang gala mo. Isang beses lang, tapos plan or join na kayo.
        </p>
        <ul className={styles.forkList}>
          {NOW_ITEMS.map((t) => (
            <li key={t}>
              <span className={styles.bullet}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              {t}
            </li>
          ))}
        </ul>
      </article>

      <div className={styles.forkOr} aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>PLUS</span>
      </div>

      <article
        className={`${styles.forkCard} ${styles.forkLater}`}
        data-reveal
        style={delay(0.25)}
        onPointerMove={tilt}
        onPointerLeave={untilt}
      >
        <span className={styles.forkTag}>SAVED SA ACCOUNT MO</span>
        <h3>Your galas, kasama mo kahit saan.</h3>
        <p className={styles.forkSub}>Libre ang account. Nandito lahat ng gala mo.</p>
        <ul className={styles.forkList}>
          {LATER_ITEMS.map((t) => (
            <li key={t}>
              <span className={styles.bullet}>
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" />
                </svg>
              </span>
              {t}
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Returning users: pill that opens into a quick gala-code input     */
/* ------------------------------------------------------------------ */

function ReEnterGala() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.replace(/\s+/g, '');
    router.push(c ? `/enter?code=${encodeURIComponent(c)}` : '/enter');
  };

  if (!open) {
    return (
      <button type="button" className={styles.reenter} onClick={() => setOpen(true)}>
        <span className={styles.reenterIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h3a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3M10 16l4-4-4-4M14 12H4" />
          </svg>
        </span>
        <span className={styles.reenterSoft}>Bagong device?</span> Enter a Gala
      </button>
    );
  }

  return (
    <form
      className={styles.reenterForm}
      onSubmit={submit}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      <label htmlFor="reenter-code" className={styles.srOnly}>
        Gala code
      </label>
      <input
        id="reenter-code"
        ref={inputRef}
        className={styles.reenterInput}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Gala code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
      />
      <button type="submit" className={styles.reenterGo} aria-label="Enter gala">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
      <button type="button" className={styles.reenterClose} onClick={() => setOpen(false)} aria-label="Close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </form>
  );
}

function Shapes({ items }: { items: ShapeDef[] }) {
  return (
    <div className={styles.bg} aria-hidden="true">
      {items.map((s, i) => {
        const style = {
          '--l': s.l,
          '--t': s.t,
          '--w': `${s.w}px`,
          '--c': `var(--${s.c})`,
          '--o': s.o,
          '--r': `${s.r ?? 0}deg`,
          '--dur': `${s.dur ?? 18}s`,
          '--dl': `${s.dl ?? 0}s`,
          '--z': s.z ?? 14,
        } as React.CSSProperties;
        const cls = `${styles.shape} ${styles[s.a ?? 'drift']}`;

        return (
          <span key={i} className={styles.px} style={style}>
            {s.k === 'glow' ? (
              <span className={`${cls} ${styles.glow}`} />
            ) : (
              <svg className={cls} viewBox={VIEWBOX[s.k]} focusable="false">
                <use href={`#otw-${s.k}`} />
              </svg>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** Shape library, drawn once and reused with <use>. Hand-drawn in the logo's style. */
function ShapeDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="otw-spark" viewBox="0 0 24 24">
          <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" />
        </symbol>
        <symbol id="otw-blob" viewBox="0 0 100 100">
          <path d="M52 4C78 2 98 22 96 50c-2 30-24 48-50 46C20 94 2 74 5 48 8 24 28 6 52 4Z" fill="currentColor" />
        </symbol>
        <symbol id="otw-noodle" viewBox="0 0 120 120">
          <path
            d="M18 74C14 26 88 12 102 52c12 38-58 56-60 14-2-38 52-34 58 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>
        <symbol id="otw-pill" viewBox="0 0 160 70">
          <rect x="2" y="2" width="156" height="66" rx="33" fill="currentColor" />
        </symbol>
        <symbol id="otw-ring" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="12" />
        </symbol>
        <symbol id="otw-squiggle" viewBox="0 0 160 40">
          <path
            d="M6 20 Q26 2 46 20 T86 20 T126 20 T156 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </symbol>
        <symbol id="otw-burst" viewBox="0 0 100 100">
          <path
            d="M50 4v18M50 78v18M4 50h18M78 50h18M17 17l13 13M70 70l13 13M83 17L70 30M30 70L17 83"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </symbol>
        <symbol id="otw-dot" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="5" fill="currentColor" />
        </symbol>
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav actions: Log in / Create account, or the signed-in name       */
/* ------------------------------------------------------------------ */

function NavActions() {
  const { signedIn, displayName } = useAccount();
  const logOut = useLogOut();
  // Nothing while checking, so neither version flashes.
  if (signedIn === undefined) return <div className={styles.navActions} aria-hidden="true" />;
  if (signedIn) {
    return (
      <div className={styles.navActions}>
        <span className={styles.navName}>Hi, {displayName}</span>
        <Link className={styles.navCta} href="/me/galas">
          My Galas
        </Link>
        <button type="button" className={styles.navLogin} onClick={logOut}>
          Log out
        </button>
      </div>
    );
  }
  return (
    <div className={styles.navActions}>
      <Link className={styles.navLogin} href="/login?tab=login">
        Log in
      </Link>
      <Link className={styles.navCta} href="/login?tab=create">
        Create account
      </Link>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const sparkleId = useRef(0);
  const navigating = useRef(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const jsReady = useIsClient();

  useEffect(() => {
    router.prefetch('/plan');
  }, [router]);

  /* Scroll-triggered entrance: items below the fold pop in as they appear. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));

    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add(styles.in));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.in);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* Pointer parallax: background shapes drift slightly toward the cursor,
     each at its own depth. Only on devices with a real pointer and when
     motion is allowed. Writes two CSS variables, nothing else. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mq = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)');
    if (!mq.matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      raf = 0;
      root.style.setProperty('--mx', x.toFixed(3));
      root.style.setProperty('--my', y.toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      x = (e.clientX / window.innerWidth - 0.5) * 2;
      y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const handleTaraClick = () => {
    if (navigating.current) return;
    navigating.current = true;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      router.push('/plan');
      return;
    }

    const newSparkles: Sparkle[] = [];
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 44 + Math.random() * 46;
      newSparkles.push({
        id: sparkleId.current++,
        tx: `${Math.cos(angle) * dist}px`,
        ty: `${Math.sin(angle) * dist}px`,
        left: `${18 + Math.random() * 20}%`,
        top: '0%',
      });
    }

    setSparkles((prev) => [...prev, ...newSparkles]);

    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => !newSparkles.some((ns) => ns.id === s.id)));
    }, 700);

    // Let the sparkle burst play for a beat before navigating.
    setTimeout(() => {
      router.push('/plan');
    }, 450);
  };

  return (
    <div ref={rootRef} className={`${styles.landing} ${jsReady ? styles.jsReady : ''}`}>
      <ShapeDefs />

      {/* Navigation: logo showcase + CTA only */}
      <nav className={styles.nav}>
        <div className={styles.logoWrap}>
          <Image
            src="/otw-logo.svg"
            alt="OTW logo"
            width={1500}
            height={1500}
            className={styles.logoImg}
            priority
          />
        </div>
        <NavActions />
      </nav>

      {/* HERO : full rosy bleed */}
      <section className={styles.hero}>
        <Shapes items={HERO_SHAPES} />

        <div className={styles.star} style={{ top: '24px', left: '6%', animationDelay: '0s' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="rgba(255,255,255,0.4)" />
          </svg>
        </div>
        <div className={styles.star} style={{ top: '70px', right: '14%', animationDelay: '-2s' }}>
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="rgba(255,255,255,0.3)" />
          </svg>
        </div>

        <div className={styles.heroInner}>
          <div>
            <span className={styles.heroBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" className={styles.badgeIcon}>
                <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" style={{ fill: 'var(--zest-ink)' }} />
              </svg>
              FOR PLANS THAT ACTUALLY HAPPEN
            </span>

            <h1 className={styles.heroRise} style={delay(0.1)}>
              From &quot;G tayo?&quot;
              <br />
              to &quot;OTW na.&quot;
            </h1>

            <p className={`${styles.lead} ${styles.heroRise}`} style={delay(0.25)}>
              Finally, a place for all those gala plans na ilang buwan nang nasa group chat. Plan it. Share it. Make it happen.
            </p>

            <div
              className={`${styles.heroCtas} ${styles.sparkleBtnWrap} ${styles.heroRise}`}
              style={delay(0.4)}
              id="ctaWrap"
            >
              <button className={styles.btnPrimary} id="taraBtn" onClick={handleTaraClick}>
                Plan a Gala
              </button>
              <Link className={styles.btnGhost} href="/join">
                Join a Gala &rarr;
              </Link>

              {/* Sparkle pop elements */}
              {sparkles.map((s) => (
                <span
                  key={s.id}
                  className={styles.starPop}
                  style={
                    {
                      left: s.left,
                      top: s.top,
                      '--tx': s.tx,
                      '--ty': s.ty,
                    } as React.CSSProperties
                  }
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="#fff" />
                  </svg>
                </span>
              ))}
            </div>

            <div className={`${styles.reenterWrap} ${styles.heroRise}`} style={delay(0.5)}>
              <ReEnterGala />
            </div>

            <p className={`${styles.accountNote} ${styles.heroRise}`} style={delay(0.55)}>
              Libre ang account. Isang beses lang, tapos plan or join na kayo.
            </p>
            <p
              className={styles.heroRise}
              style={{ ...delay(0.6), color: 'var(--rosy-tint)', fontSize: '12px', marginTop: '14px', fontWeight: 700 }}
            >
              And yes, we can tell if you&apos;re actually OTW.
            </p>
          </div>

          {/* WITHOUT OTW vs WITH OTW conversation ad */}
          <div className={`${styles.heroMascot} ${styles.heroRise}`} style={{ ...delay(0.3), height: 'auto' }}>
            <OtwConversationAd />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS : full zest bleed */}
      <section className={styles.how} id="how">
        <Shapes items={HOW_SHAPES} />

        <div className={styles.howInner}>
          <h2 data-reveal style={delay(0)}>Your gala starts here.</h2>
          <p className={styles.howSub} data-reveal style={delay(0.1)}>
            NO COMPLICATED SETUP. JUST MAKE A PLAN AND GET EVERYONE MOVING.
          </p>
          <RoadTracker />
        </div>
      </section>

      {/* FEATURES : full teal bleed, no-account vs. account fork */}
      <section className={styles.features} id="features" aria-label="Ways to use OTW">
        <Shapes items={FEATURE_SHAPES} />

        <div className={styles.featuresInner}>
          <ForkCards />
        </div>
      </section>

      {/* CTA BANNER : blossom bleed */}
      <section className={styles.ctaBanner}>
        <Shapes items={CTA_SHAPES} />

        <div className={styles.star} style={{ top: '24px', right: '12%', animationDelay: '-1s' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="#e0417c" />
          </svg>
        </div>
        <h2 id="get-started" data-reveal style={delay(0)}>
          Your next gala is one tap away
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--rosy-dark)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ verticalAlign: '-4px', marginLeft: '4px' }}
          >
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2" />
            <circle cx="12" cy="12" r="3" fill="var(--rosy-dark)" stroke="none" />
          </svg>
        </h2>
        <p data-reveal style={delay(0.1)}>Libre ang account. Zero planning skills required.</p>
        <div className={styles.ctaBtnWrap} data-reveal style={delay(0.2)}>
          <Link className={styles.btnDark} href="/plan">
            Tara G! — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <Shapes items={FOOTER_SHAPES} />

        <div className={styles.footerLogoWrap}>
          <Image
            src="/otw-logo.svg"
            alt="OTW logo"
            width={1500}
            height={1500}
            className={styles.logoImg}
          />
        </div>
        <p>
          On The Way — planning made for people who decide things last minute
          <svg width="12" height="12" viewBox="0 0 24 24" style={{ verticalAlign: '1px', marginLeft: '2px' }}>
            <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" style={{ fill: 'var(--teal-tint)' }} />
          </svg>
        </p>
        <p className={styles.footerNote}>Kailangan ng account para mag-plan o mag-join. Libre &apos;yan.</p>
        <nav className={styles.footerLinks} aria-label="Footer">
          <Link href="/plan">Plan a Gala</Link>
          <Link href="/join">Join a Gala</Link>
          <Link href="/enter">Enter a Gala</Link>
          <Link href="/login">Log in</Link>
        </nav>
      </footer>
    </div>
  );
}