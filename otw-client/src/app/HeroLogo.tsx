'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { burst } from '@/lib/otw/feedback';
import landing from './landing.module.css';
import s from './HeroLogo.module.css';

const DRIVE_MS = 1700;
const CAR_W = 0.62; // car width as a share of the logo width

/* The hero logo. Click it and a little OTW car drives over it. It flattens, then pops back. */
export function HeroLogo() {
  const wrap = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'idle' | 'drive'>('idle');
  const [flat, setFlat] = useState(false);
  const [lane, setLane] = useState({ from: 0, to: 0 });
  const busy = useRef(false);

  const run = () => {
    const el = wrap.current;
    if (!el || busy.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    busy.current = true;

    const r = el.getBoundingClientRect();
    const carW = r.width * CAR_W;
    const vw = window.innerWidth;
    // the car crosses the whole screen at a steady speed, so we know when it reaches and leaves the logo
    const travel = vw + carW;
    setLane({ from: -(r.left + carW), to: vw - r.left });
    const reach = ((r.left + carW * 0.55) / travel) * DRIVE_MS;
    const leave = ((r.left + r.width + carW * 0.45) / travel) * DRIVE_MS;

    // the chat deck sags under the car's weight while it drives over, then springs back (down-and-settle, never up)
    const deck = document.querySelector<HTMLElement>('[aria-label^="Group chat"]');
    if (deck) {
      const d = deck.getBoundingClientRect();
      // sink far enough that the top of the deck is below the car's wheels, so the car never touches it
      const wheels = r.bottom - r.height * 0.2 + 8;
      deck.style.setProperty('--sag', `${Math.max(40, wheels + 12 - d.top) / 0.9}px`); // deck is zoomed to 90%
      const press = Math.max(0, ((d.left + carW * 0.35) / travel) * DRIVE_MS);
      const release = ((d.right + carW * 0.45) / travel) * DRIVE_MS;
      setTimeout(() => deck.setAttribute('data-hop', 'press'), press);
      setTimeout(() => deck.setAttribute('data-hop', 'release'), release);
      setTimeout(() => deck.removeAttribute('data-hop'), release + 1000);
    }

    setPhase('drive');
    setTimeout(() => {
      setFlat(true);
      burst(r.left + r.width / 2, r.top + r.height * 0.7);
    }, reach);
    setTimeout(() => setFlat(false), leave);
    setTimeout(() => {
      setPhase('idle');
      busy.current = false;
    }, DRIVE_MS + 150);
  };

  return (
    <div ref={wrap} className={landing.logoWrap}>
      <button type="button" className={s.btn} onClick={run} aria-label="OTW logo">
        <span className={`${s.art} ${flat ? s.flat : ''}`}>
          <Image src="/otw-logo.svg" alt="OTW logo" width={1500} height={1027} className={landing.logoImg} priority />
        </span>
      </button>

      {phase === 'drive' && (
        <svg
          viewBox="0 0 250 112"
          className={s.car}
          style={{ '--from': `${lane.from}px`, '--to': `${lane.to}px`, '--ms': `${DRIVE_MS}ms` } as React.CSSProperties}
          aria-hidden="true"
          focusable="false"
        >
          <g stroke="#fff8f2" strokeWidth="5" strokeLinecap="round" opacity="0.8">
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
            <g key={cx} className={s.wheel} style={{ transformOrigin: `${cx}px 88px` }}>
              <circle cx={cx} cy="88" r="21" fill="#1f6376" />
              <circle cx={cx} cy="88" r="9" fill="#fff8f2" />
              <path d={`M${cx} 70v36M${cx - 18} 88h36`} stroke="#fff8f2" strokeWidth="3" strokeLinecap="round" />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
