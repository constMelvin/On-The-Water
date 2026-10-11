'use client';

/** Small shared pieces for the landing prototype: hooks, avatars, icons. Nothing here touches the real app. */
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import b from './base.module.css';

export type Tone = 'rosy' | 'teal' | 'zest' | 'blossom';

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/** True when the visitor prefers reduced motion: sequences then show their finished state at once. */
export function useReduced(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );
}

/** Becomes true (and stays true unless `once` is false) when the element is on screen. */
export function useInView<T extends HTMLElement>(options: { once?: boolean; margin?: string } = {}) {
  const { once = true, margin = '0px 0px -12% 0px' } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin: margin, threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, margin]);
  return [ref, inView] as const;
}

/** Fades and lifts its children in when they scroll into view. */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'section' | 'p' | 'h2' | 'h3' }) {
  const [ref, inView] = useInView<HTMLElement>();
  const Comp = Tag as 'div';
  return (
    <Comp ref={ref as React.RefObject<HTMLDivElement>} className={`${b.reveal} ${inView ? b.revealIn : ''} ${className}`} style={{ '--rd': `${delay}s` } as CSSProperties}>
      {children}
    </Comp>
  );
}

export function Av({ n, tone, size = 34, ring = true }: { n: string; tone: Tone; size?: number; ring?: boolean }) {
  return (
    <i className={`${b.av} ${b[`av_${tone}`]} ${ring ? b.avRing : ''}`} style={{ width: size, height: size, fontSize: size * 0.44 }}>
      {n}
    </i>
  );
}

export const PEOPLE: { n: string; name: string; tone: Tone }[] = [
  { n: 'A', name: 'Ana', tone: 'rosy' },
  { n: 'B', name: 'Ben', tone: 'teal' },
  { n: 'C', name: 'Cai', tone: 'zest' },
  { n: 'D', name: 'Dani', tone: 'blossom' },
];

type IconName = 'pin' | 'check' | 'chat' | 'wallet' | 'camera' | 'heart' | 'crown' | 'route' | 'user' | 'send' | 'x' | 'arrow' | 'list' | 'nav' | 'sparkle' | 'plus' | 'copy' | 'calendar' | 'home' | 'image';

const PATHS: Record<IconName, ReactNode> = {
  pin: (
    <>
      <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.4" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chat: <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  wallet: (
    <>
      <rect x="3" y="7" width="18" height="12" rx="4" />
      <path d="M3 10.5h18" />
      <circle cx="16.5" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  crown: <path d="M4 18l-1-10 5 4 4-7 4 7 5-4-1 10z" />,
  route: (
    <>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M8 6h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
    </>
  ),
  send: <path d="M4 12l16-8-6 16-3-7z" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  list: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  nav: <path d="M12 3l7 17-7-4-7 4z" />,
  sparkle: <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill="currentColor" stroke="none" />,
  plus: <path d="M12 5v14M5 12h14" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="3" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="4" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  home: (
    <>
      <path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="4" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l5-4 4 3 3-2 4 3" />
    </>
  ),
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/** The OTW logo, straight from the app's public folder. */
export function Logo({ width = 120 }: { width?: number }) {
  return (
    <span className={b.logo} style={{ width, aspectRatio: '1500 / 1027' }}>
      <img src="/otw-logo.svg" alt="OTW" />
    </span>
  );
}

/** A wavy divider ("on the water") between two colours. */
export function Wave({ top, bottom, flip = false }: { top: string; bottom: string; flip?: boolean }) {
  return (
    <div className={b.wave} style={{ background: top, transform: flip ? 'scaleY(-1)' : undefined }} aria-hidden="true">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none">
        <path d="M0 40c120 36 240 36 360 8s240-44 360-20 240 52 360 40 240-48 360-28V90H0z" fill={bottom} />
      </svg>
    </div>
  );
}
