'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { Av, Icon, PEOPLE, Wave, useReduced } from './kit';
import b from './base.module.css';
import h from './hero.module.css';

/** The headline: every letter rises in on its own (masked), then wiggles when you hover it. */
function Letters({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <>
      {text.split('').map((c, i) => (
        <span key={i} className={h.mask} aria-hidden="true">
          <span className={h.ch} style={{ '--i': start + i } as CSSProperties}>
            {c}
          </span>
        </span>
      ))}
    </>
  );
}

export function Hero({ onPlan, onJoin }: { onPlan: () => void; onJoin: () => void }) {
  const hero = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const reduced = useReduced();

  // Desktop only: the collage and the background shapes drift a little toward the pointer.
  useEffect(() => {
    const el = hero.current;
    const st = stage.current;
    if (!el || !st || reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0;
    let nx = 0;
    let ny = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty('--mx', nx.toFixed(3));
      el.style.setProperty('--my', ny.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      nx = 0;
      ny = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <>
      <section ref={hero} className={h.hero} id="top" aria-labelledby="hero-title">
        {/* background: soft shapes that drift with the pointer at different depths */}
        <div className={h.bg} aria-hidden="true">
          <span className={h.bgLayer} style={{ '--k': -10 } as CSSProperties}>
            <i className={`${h.shape} ${h.blobA}`} />
          </span>
          <span className={h.bgLayer} style={{ '--k': 16 } as CSSProperties}>
            <i className={`${h.shape} ${h.ringA}`} />
          </span>
          <span className={h.bgLayer} style={{ '--k': -22 } as CSSProperties}>
            <svg className={`${h.shape} ${h.noodle}`} viewBox="0 0 120 120">
              <path d="M18 74C14 26 88 12 102 52c12 38-58 56-60 14-2-38 52-34 58 6" fill="none" stroke="currentColor" strokeWidth="15" strokeLinecap="round" />
            </svg>
          </span>
          <span className={h.bgLayer} style={{ '--k': 26 } as CSSProperties}>
            <svg className={`${h.shape} ${h.sparkA}`} viewBox="0 0 24 24">
              <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" />
            </svg>
          </span>
        </div>

        <div className={h.grid}>
          <div className={h.copy}>
            <span className={`${h.badge} ${h.rise}`} style={{ '--d': '0s' } as CSSProperties}>
              <Icon name="sparkle" size={14} /> For plans that actually happen
            </span>

            <h1 id="hero-title" className={h.title} aria-label="Make it happen.">
              <span className={h.line}>
                <Letters text="Make" />
                <span className={h.gap} aria-hidden="true" />
                <Letters text="it" start={4} />
              </span>
              <span className={`${h.line} ${h.accent}`}>
                <Letters text="happen." start={6} />
                <svg className={h.squiggle} viewBox="0 0 320 22" aria-hidden="true" preserveAspectRatio="none">
                  <path d="M4 12 Q 24 0 44 12 T 84 12 T 124 12 T 164 12 T 204 12 T 244 12 T 284 12 T 316 12" pathLength={1} />
                </svg>
              </span>
            </h1>

            <p className={`${h.sub} ${h.rise}`} style={{ '--d': '1.1s' } as CSSProperties}>
              OTW turns “G tayo?” into a date, a route, a budget, and a barkada that actually shows up.
            </p>

            <div className={`${h.ctas} ${h.rise}`} style={{ '--d': '1.3s' } as CSSProperties}>
              <button type="button" className={`${b.btn} ${b.btnCream}`} onClick={onPlan}>
                Plan a Gala
              </button>
              <button type="button" className={`${b.btn} ${b.btnGhost}`} onClick={onJoin}>
                Join a Gala <Icon name="arrow" size={20} />
              </button>
            </div>

            <ul className={`${h.facts} ${h.rise}`} style={{ '--d': '1.5s' } as CSSProperties}>
              <li>Free account</li>
              <li>Code + password to join</li>
              <li>Works in any phone browser</li>
            </ul>
          </div>

          <div ref={stage} className={h.stage} aria-hidden="true">
            {/* gala card */}
            <div className={`${h.layer} ${h.lCard}`} style={{ '--k': 18, '--d': '0.5s' } as CSSProperties}>
              <div className={h.float} style={{ '--fd': '0s' } as CSSProperties}>
                <div className={h.galaCard}>
                  <span className={h.galaTag}>Gala</span>
                  <b>Tagaytay Barkada</b>
                  <span className={h.galaRow}>
                    <Icon name="calendar" size={16} /> Oct 24–25
                  </span>
                  <span className={h.galaCode}>
                    OTW-7K2P-ABCD <Icon name="copy" size={14} />
                  </span>
                  <span className={h.galaFoot}>
                    <span className={h.avs}>
                      {PEOPLE.map((p) => (
                        <Av key={p.name} n={p.n} tone={p.tone} size={30} />
                      ))}
                    </span>
                    <em>4 are G</em>
                  </span>
                </div>
              </div>
            </div>

            {/* chat bubbles */}
            <div className={`${h.layer} ${h.lChat}`} style={{ '--k': -30, '--d': '0.75s' } as CSSProperties}>
              <div className={h.float} style={{ '--fd': '-1.4s' } as CSSProperties}>
                <div className={h.chat}>
                  <p className={`${h.bub} ${h.b1}`}>G tayo?</p>
                  <p className={`${h.bub} ${h.b2}`}>Saturday!</p>
                  <p className={`${h.bub} ${h.b3}`}>OTW na.</p>
                </div>
              </div>
            </div>

            {/* itinerary */}
            <div className={`${h.layer} ${h.lPlan}`} style={{ '--k': 34, '--d': '1s' } as CSSProperties}>
              <div className={h.float} style={{ '--fd': '-0.7s' } as CSSProperties}>
                <ul className={h.plan}>
                  {[
                    ['6:00 AM', 'Meet-up', 'Cubao'],
                    ['9:30 AM', 'Food', 'Bulalo stop'],
                    ['1:00 PM', 'Activity', 'Taal view'],
                  ].map(([time, type, what], i) => (
                    <li key={time} style={{ '--i': i } as CSSProperties}>
                      <b>{time}</b>
                      <span>
                        <em>{type}</em> {what}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* location */}
            <div className={`${h.layer} ${h.lLoc}`} style={{ '--k': -16, '--d': '1.2s' } as CSSProperties}>
              <div className={h.float} style={{ '--fd': '-2.1s' } as CSSProperties}>
                <div className={h.loc}>
                  <span className={h.pinWrap}>
                    <i className={h.pulse} />
                    <i className={h.pulse} style={{ animationDelay: '0.9s' }} />
                    <span className={h.pin}>
                      <Icon name="pin" size={20} />
                    </span>
                  </span>
                  <span className={h.locText}>
                    <b>Ben is on the way</b>
                    <small>Sharing live</small>
                  </span>
                </div>
              </div>
            </div>

            {/* sticker */}
            <div className={`${h.layer} ${h.lSticker}`} style={{ '--k': 40, '--d': '1.4s' } as CSSProperties}>
              <div className={h.float} style={{ '--fd': '-0.3s' } as CSSProperties}>
                <span className={h.sticker}>
                  <Icon name="check" size={18} /> I&apos;m G
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Wave top="var(--rosy-dark)" bottom="var(--zest)" />
    </>
  );
}

const PHRASES = ['G tayo?', 'Saan tayo?', 'Magkano ba?', 'Sino may sasakyan?', 'Seen lang?', 'Next time na lang?', 'OTW na.'];

/** A scrolling band of the questions every group chat knows. Motion is a plain transform loop. */
export function Marquee() {
  const row = [...PHRASES, ...PHRASES];
  return (
    <div className={h.marquee} aria-label="Things every group chat says">
      <div className={h.track} aria-hidden="true">
        {[0, 1].map((k) => (
          <ul key={k} className={h.strip}>
            {row.map((t, i) => (
              <li key={`${k}-${i}`} className={t === 'OTW na.' ? h.hot : ''}>
                {t}
                <Icon name="sparkle" size={18} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
