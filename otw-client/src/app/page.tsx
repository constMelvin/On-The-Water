'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css';
import OtwConversationAd from './OtwConversationAd';

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
        <Link className={styles.navCta} href="#get-started">
          Tara G!
        </Link>
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
                <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="#5a4d10" />
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

            <p
              className={styles.heroRise}
              style={{ ...delay(0.55), color: '#ffdcea', fontSize: '12px', marginTop: '12px', fontWeight: 700 }}
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
          <div className={styles.steps}>
            <div className={styles.stepBlob} data-reveal style={delay(0.15)}>
              <div className={styles.num}>1</div>
              <h3>G tayo?</h3>
              <p>Pick a date, get the tropa, and give your gala a name your GC will remember.</p>
            </div>
            <div className={styles.stepBlob} data-reveal style={delay(0.3)}>
              <div className={styles.num}>2</div>
              <h3>Okay, what&apos;s the plan?</h3>
              <p>Build the itinerary, sort out the budget, and keep everything in one place.</p>
            </div>
            <div className={styles.stepBlob} data-reveal style={delay(0.45)}>
              <div className={styles.num}>3</div>
              <h3>OTW na ba talaga?</h3>
              <p>Share your location on the day itself. Less &quot;Nasaan ka na?&quot; More &quot;2 mins away.&quot;</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES : full teal bleed, blossom blob cards */}
      <section className={styles.features} id="features">
        <Shapes items={FEATURE_SHAPES} />

        <div className={styles.featuresInner}>
          <div className={styles.sectionHead} data-reveal style={delay(0)}>
            <h2>Built for the group chat energy</h2>
            <p>Four things, done well, so nobody has to be &quot;the planner&quot; ever again</p>
          </div>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard} data-reveal style={delay(0.1)}>
              <div className={styles.iconBlob}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--rosy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
                  <circle cx="12" cy="9" r="2.4" />
                </svg>
              </div>
              <h3>Saan Tayo?</h3>
              <p>Drop a location poll, votes come in live, winner locks the plan.</p>
              <span className={styles.tag}>LOCATION POLLS</span>
            </div>
            <div className={styles.featureCard} data-reveal style={delay(0.25)}>
              <div className={styles.iconBlob}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--rosy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="7" width="18" height="12" rx="4" />
                  <path d="M3 10.5h18" />
                  <circle cx="16.5" cy="14.5" r="1.3" fill="var(--rosy)" stroke="none" />
                </svg>
              </div>
              <h3>Ambagan</h3>
              <p>Shared costs split and tracked automatically — no group-chat math.</p>
              <span className={styles.tag}>SHARED EXPENSES</span>
            </div>
            <div className={styles.featureCard} data-reveal style={delay(0.4)}>
              <div className={styles.iconBlob}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--rosy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="3" width="14" height="18" rx="4" />
                  <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
              </div>
              <h3>Mga Drawing</h3>
              <p>Plans that fell through get shelved, not deleted — revive anytime.</p>
              <span className={styles.tag}>SHELVED PLANS</span>
            </div>
          </div>
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
        <p data-reveal style={delay(0.1)}>Free to start. Zero planning skills required.</p>
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
            <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="#bfe3ec" />
          </svg>
        </p>
      </footer>
    </div>
  );
}