'use client';

/**
 * The landing page's scroll-driven app tour (loaded lazily by WalkthroughSlot, so none of this is in the
 * landing page's first load).
 *
 * Desktop: one phone sticks to the screen while the captions scroll past; whichever step crosses the middle of
 * the screen is the active one and its scene plays. Phones and reduced motion: no sticking at all. Each step
 * is its own caption + phone, stacked, and its scene plays once when it scrolls into view (with reduced
 * motion it simply shows the finished picture, no motion, nothing to wait for).
 * Everything is illustrative: nothing here reads real data.
 *
 * To shorten the tour, delete an entry from STEPS (and nothing else).
 */
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { TourHeader } from './TourHeader';
import { TourShapes } from './TourShapes';
import { AmbaganScene, ChatScene, PlanScene, RouteScene, WhosGScene } from './scenes';
import { AwardsScene, CoupleScene, LocationScene } from './scenes-standout';
import s from './walkthrough.module.css';

type Tone = 'rosy' | 'zest' | 'teal' | 'blossom';

/** Small outline icons for the floating stickers around the phone. */
const ICON: Record<string, ReactNode> = {
  sparkle: <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="currentColor" stroke="none" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  pin: (
    <>
      <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.4" />
    </>
  ),
  nav: <path d="M12 3l7 17-7-4-7 4z" />,
  wallet: (
    <>
      <rect x="3" y="7" width="18" height="12" rx="4" />
      <path d="M3 10.5h18" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  chat: <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  crown: <path d="M4 18l-1-10 5 4 4-7 4 7 5-4-1 10z" />,
};

interface Sticker {
  /** px from the phone area's left / top */
  x: number;
  y: number;
  icon: keyof typeof ICON;
  tone?: 'teal' | 'zest';
}

interface Step {
  id: string;
  /** Short label for the step rail. */
  label: string;
  title: string;
  text: string;
  /** Small facts under the caption. */
  tags: string[];
  /** The section's background colour while this step is active (and so the caption's ink). */
  tone: Tone;
  /** A "standout" step gets more room to breathe. */
  long?: boolean;
  stickers: Sticker[];
  scene: ReactNode;
}

const STEPS: Step[] = [
  {
    id: 'plan',
    label: 'Plan',
    title: 'Make a gala. Get a code.',
    text: 'Name it, pick a date, then share the code with the group chat.',
    tags: ['Gala code', 'Gala password'],
    tone: 'rosy',
    stickers: [
      { x: 322, y: 90, icon: 'sparkle', tone: 'zest' },
      { x: -6, y: 360, icon: 'check' },
    ],
    scene: <PlanScene />,
  },
  {
    id: 'whos-g',
    label: 'Who’s G?',
    title: 'Who’s G? Answer now.',
    text: 'I’m G, Maybe, or Can’t make it. No more “seen.”',
    tags: ['Live headcount'],
    tone: 'zest',
    stickers: [
      { x: -6, y: 120, icon: 'check' },
      { x: 322, y: 300, icon: 'sparkle', tone: 'teal' },
    ],
    scene: <WhosGScene />,
  },
  {
    id: 'route',
    label: 'The plan',
    title: 'Stop by stop. With a route.',
    text: 'Add stops on the map, set the times, and see the route.',
    tags: ['Map pins', 'Route', 'Times'],
    tone: 'teal',
    stickers: [
      { x: 322, y: 110, icon: 'pin' },
      { x: -6, y: 330, icon: 'nav', tone: 'zest' },
    ],
    scene: <RouteScene />,
  },
  {
    id: 'ambagan',
    label: 'Ambagan',
    title: 'Ambagan, no one chasing.',
    text: 'Log who paid, then see right away who owes whom.',
    tags: ['Split by person', 'Mark paid'],
    tone: 'blossom',
    stickers: [
      { x: -6, y: 100, icon: 'wallet' },
      { x: 322, y: 360, icon: 'check', tone: 'zest' },
    ],
    scene: <AmbaganScene />,
  },
  {
    id: 'chat',
    label: 'Chat',
    title: 'Chismis, with a plan.',
    text: 'Chat, react, and see every change to the plan right away.',
    tags: ['Reactions', 'Plan updates'],
    tone: 'rosy',
    stickers: [
      { x: 322, y: 120, icon: 'heart' },
      { x: -6, y: 320, icon: 'chat', tone: 'teal' },
    ],
    scene: <ChatScene />,
  },
  {
    id: 'location',
    label: 'Location',
    title: 'Who’s OTW? Live.',
    text: 'Choose when to share. The group can see who’s still at home, on the way, or already there.',
    tags: ['Opt-in', 'Stop anytime', 'Meeting point'],
    tone: 'teal',
    long: true,
    stickers: [
      { x: -6, y: 90, icon: 'pin' },
      { x: 322, y: 330, icon: 'nav', tone: 'zest' },
    ],
    scene: <LocationScene />,
  },
  {
    id: 'couple',
    label: 'Couple',
    title: 'Just the two of you? Get your own mode.',
    text: 'A bucket list for two. Check it off, add a memory, and celebrate.',
    tags: ['Bucket list', 'Halfway', 'Who knows who?'],
    tone: 'blossom',
    long: true,
    stickers: [
      { x: 322, y: 80, icon: 'heart' },
      { x: -6, y: 340, icon: 'sparkle', tone: 'zest' },
    ],
    scene: <CoupleScene />,
  },
  {
    id: 'awards',
    label: 'Awards',
    title: 'Barkada Awards. Trophy included.',
    text: 'Votes are anonymous. When voting closes there’s a reveal, a sparkle, and a certificate for every winner.',
    tags: ['Anonymous votes', 'Winner reveal', 'Certificate'],
    tone: 'zest',
    long: true,
    stickers: [
      { x: -6, y: 110, icon: 'crown', tone: 'zest' },
      { x: 322, y: 340, icon: 'sparkle' },
    ],
    scene: <AwardsScene />,
  },
];

/* ---- environment: reduced motion and narrow screens (read on the client only; this chunk never runs on the server) ---- */

const subscribeMq = (query: string) => (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const REDUCED = '(prefers-reduced-motion: reduce)';
const NARROW = '(max-width: 900px)';

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    subscribeMq(query),
    () => window.matchMedia(query).matches,
    () => false
  );
}

export function Walkthrough() {
  const reduced = useMedia(REDUCED);
  const narrow = useMedia(NARROW);
  // Stacked: each step is its own caption + phone. Used on phones and whenever motion is reduced.
  const stacked = reduced || narrow;

  const root = useRef<HTMLElement>(null);
  const stepEls = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  /** Steps that have played (stacked mode keeps their finished picture on screen). */
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const [live, setLive] = useState(false);

  // Which step crosses the middle of the screen is the active one.
  useEffect(() => {
    if (reduced || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.i);
          setActive(i);
          setSeen((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    stepEls.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [reduced, stacked]);

  // Nothing animates while the tour is off screen or the tab is hidden.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let onScreen = true;
    const apply = () => setLive(onScreen && !document.hidden);
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        apply();
      },
      { rootMargin: '80px 0px' }
    );
    io.observe(el);
    document.addEventListener('visibilitychange', apply);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', apply);
    };
  }, []);

  const jump = (i: number) => {
    stepEls.current[i]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  };

  const tone = STEPS[active].tone;
  const mode = reduced ? 'static' : stacked ? 'stacked' : 'sticky';

  return (
    <section
      ref={root}
      id="tour"
      className={s.tour}
      data-mode={mode}
      data-live={live}
      data-tone={tone}
      aria-labelledby="tour-title"
      style={{ '--n': STEPS.length } as CSSProperties}
    >
      {/* The background changes colour with each step: layers fade by opacity, nothing repaints */}
      <div className={s.bgs} aria-hidden="true">
        {(['rosy', 'zest', 'teal', 'blossom'] as const).map((t) => (
          <i key={t} className={`${s.bgLayer} ${s[`bg_${t}`]}`} data-on={!stacked && tone === t} />
        ))}
        <TourShapes />
      </div>

      <div className={s.inner}>
        <TourHeader />

        <div className={s.stage}>
          {mode === 'sticky' && (
            <div className={s.deviceCol}>
              <div className={s.sticky} data-par={active % 2}>
                <i className={s.glow} aria-hidden="true" />
                <div className={s.tilt}>
                  <Phone>
                    {STEPS.map((st, i) => (
                      <div key={st.id} className={s.scene} data-on={active === i}>
                        {st.scene}
                      </div>
                    ))}
                  </Phone>
                </div>
                <div className={s.stickerLayer} aria-hidden="true">
                  {STEPS.map((st, i) =>
                    st.stickers.map((k, j) => (
                      <span
                        key={`${st.id}-${j}`}
                        className={`${s.sticker} ${k.tone ? s[`sticker_${k.tone}`] : ''} ${active === i ? `${s.stickerOn} ${s.stickerBob}` : ''}`}
                        style={{ left: k.x, top: k.y, transitionDelay: active === i ? `${0.25 + j * 0.15}s` : '0s' }}
                      >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          {ICON[k.icon]}
                        </svg>
                      </span>
                    ))
                  )}
                </div>
                <Rail steps={STEPS} active={active} onJump={jump} />
              </div>
            </div>
          )}

          <ol className={s.steps}>
            {STEPS.map((st, i) => (
              <li
                key={st.id}
                ref={(el) => {
                  stepEls.current[i] = el;
                }}
                data-i={i}
                className={`${s.step} ${st.long ? s.stepLong : ''} ${s[`ink_${st.tone}`]}`}
                data-active={mode === 'sticky' ? active === i : true}
              >
                <span className={s.ghostNum} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className={s.caption}>
                  <span className={s.eyebrow}>Step {String(i + 1).padStart(2, '0')}</span>
                  <h3>{st.title}</h3>
                  <p>{st.text}</p>
                  <ul className={s.tags} aria-label="Highlights">
                    {st.tags.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                {mode !== 'sticky' && (
                  <div className={s.stackedPhone}>
                    <Phone>
                      <div className={s.scene} data-on={mode === 'stacked' && seen.has(i)}>
                        {st.scene}
                      </div>
                    </Phone>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className={s.end}>
          <h3>Ready? Tara G!</h3>
          <p>No planning skills required. Just bring the group chat.</p>
          <div className={s.endCtas}>
            <Link className={s.endPrimary} href="/plan">
              Plan a Gala
            </Link>
            <Link className={s.endGhost} href="/join">
              Join a Gala &rarr;
            </Link>
          </div>
          <small className={s.endFine}>One free account. Plan a gala or join your barkada.</small>
        </div>
      </div>
    </section>
  );
}

/** The phone: pure CSS, with a notch and a status bar. The screen is whatever scene it's given. */
function Phone({ children }: { children: ReactNode }) {
  return (
    <div className={s.phoneBox}>
      <div className={s.phone} aria-hidden="true">
        <span className={s.notch} />
        <div className={s.statusBar}>
          <span>9:41</span>
          <span className={s.statusIcons}>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
              <rect x="0" y="6" width="2.4" height="4" rx="1" />
              <rect x="3.8" y="4" width="2.4" height="6" rx="1" />
              <rect x="7.6" y="2" width="2.4" height="8" rx="1" />
              <rect x="11.4" y="0" width="2.4" height="10" rx="1" />
            </svg>
            <svg width="20" height="10" viewBox="0 0 20 10" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="0.7" y="0.7" width="16" height="8.6" rx="2.6" />
              <rect x="2.4" y="2.4" width="11" height="5.2" rx="1.2" fill="currentColor" stroke="none" />
              <path d="M18.4 3.4v3.2" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        <div className={s.screen}>{children}</div>
      </div>
    </div>
  );
}

/** Jump straight to a step (keyboard friendly). */
function Rail({ steps, active, onJump }: { steps: Step[]; active: number; onJump: (i: number) => void }) {
  return (
    <nav className={s.rail} aria-label="Tour steps">
      <span className={s.railFill} style={{ transform: `scaleX(${(active + 1) / steps.length})` }} aria-hidden="true" />
      {steps.map((st, i) => (
        <button key={st.id} type="button" className={s.railBtn} aria-label={`Step ${i + 1}: ${st.label}`} aria-current={i === active ? 'step' : undefined} onClick={() => onJump(i)}>
          <span aria-hidden="true">{i + 1}</span>
        </button>
      ))}
    </nav>
  );
}
