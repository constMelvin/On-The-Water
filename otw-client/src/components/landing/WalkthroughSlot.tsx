'use client';

/**
 * The landing page's scroll-driven app tour, loaded lazily. Until the visitor scrolls within a screen or so
 * of it, only this light placeholder exists (the heading and a reserved height, so the page doesn't jump):
 * the tour's code is a separate chunk that isn't even downloaded before that. That keeps the hero and the
 * rest of the landing page as fast as they were.
 */
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { TourHeader } from './TourHeader';
import s from './walkthrough.module.css';

const Walkthrough = dynamic(() => import('./Walkthrough').then((m) => m.Walkthrough), { ssr: false });

/** How early (before it scrolls into view) the tour starts loading. */
const LOAD_AHEAD = '900px 0px';

export function WalkthroughSlot() {
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: LOAD_AHEAD }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (near) return <Walkthrough />;

  return (
    <section ref={ref} id="tour" className={`${s.tour} ${s.reserve}`} aria-labelledby="tour-title">
      <div className={s.inner}>
        <TourHeader />
      </div>
    </section>
  );
}
