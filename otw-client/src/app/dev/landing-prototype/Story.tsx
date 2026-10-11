'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { burst } from '@/lib/otw/feedback';
import { Av, Icon, PEOPLE, Reveal, Wave, useReduced } from './kit';
import b from './base.module.css';
import s from './story.module.css';

const PATH = 'M50 0 L50 125 C 96 200, 4 300, 50 375 C 96 450, 4 550, 50 625 C 96 700, 4 800, 50 875 L50 1000';
const PINS = [125, 375, 625, 875];

const CHAPTERS = [
  { n: '01', title: 'Pick a date', text: 'Turn “someday” into a day on everyone’s calendar.' },
  { n: '02', title: 'See who’s G', text: 'I’m G, Maybe, or Can’t make it. No more “seen.”' },
  { n: '03', title: 'Build the route', text: 'Stops, times and food breaks, in the order you’ll live them.' },
  { n: '04', title: 'Go together', text: 'Share your location on gala day and watch everyone arrive.' },
];

function Calendar({ on }: { on: boolean }) {
  const days = Array.from({ length: 21 }, (_, i) => i + 12);
  return (
    <div className={s.cal}>
      <header>
        <b>October</b>
        <span>2026</span>
      </header>
      <div className={s.calGrid}>
        {days.map((d) => (
          <i key={d} className={on && (d === 24 || d === 25) ? s.calOn : ''} style={{ '--i': d - 12 } as CSSProperties}>
            {d}
          </i>
        ))}
      </div>
    </div>
  );
}

function WhosG({ on }: { on: boolean }) {
  return (
    <div className={s.gTiles}>
      {PEOPLE.map((p, i) => (
        <div key={p.name} className={`${s.gTile} ${on ? s.gOn : ''}`} style={{ '--i': i } as CSSProperties}>
          <Av n={p.n} tone={p.tone} size={40} />
          <b>{p.name}</b>
          <span className={s.gChip}>
            <span className={s.gMaybe}>Maybe</span>
            <span className={s.gYes}>
              <Icon name="check" size={13} /> I&apos;m G
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Route({ on }: { on: boolean }) {
  const rows = [
    ['6:00 AM', 'Meet-up', 'Cubao'],
    ['9:30 AM', 'Food', 'Bulalo stop'],
    ['1:00 PM', 'Activity', 'Taal view'],
    ['6:30 PM', 'Food', 'Dinner by the lake'],
  ];
  return (
    <ul className={`${s.route} ${on ? s.routeOn : ''}`}>
      {rows.map(([t, type, what], i) => (
        <li key={t} style={{ '--i': i } as CSSProperties}>
          <i>{i + 1}</i>
          <b>{t}</b>
          <span>
            <em>{type}</em> {what}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Arrive({ on }: { on: boolean }) {
  const spots: [number, number][] = [
    [22, 70],
    [44, 56],
    [66, 62],
    [80, 44],
  ];
  return (
    <div className={`${s.map} ${on ? s.mapOn : ''}`}>
      <svg viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 90c30-14 52 6 80-8s50-26 82-18 30 12 38 10V120H0z" className={s.water} />
        <path d="M-5 40 60 54 130 28 205 46" className={s.road} />
        <path d="M20 90 C 60 60, 90 70, 150 34" pathLength={1} className={s.routeLine} />
      </svg>
      <span className={s.flag}>
        <Icon name="pin" size={18} />
      </span>
      {PEOPLE.map((p, i) => (
        <span key={p.name} className={s.arrive} style={{ left: `${spots[i][0]}%`, top: `${spots[i][1]}%`, '--i': i } as CSSProperties}>
          <Av n={p.n} tone={p.tone} size={30} />
        </span>
      ))}
      <span className={s.here}>
        <Icon name="check" size={14} /> Everyone&apos;s here
      </span>
    </div>
  );
}

export function Story() {
  const sec = useRef<HTMLElement>(null);
  const [reached, setReached] = useState(-1);
  const reducedMotion = useReduced();
  const burstOnce = useRef(false);

  // Scroll progress through the track drives the route line, the pin that rides it and the chapters.
  useEffect(() => {
    const el = sec.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const track = el.querySelector<HTMLElement>('[data-track]');
      if (!track) return;
      const r = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.62 - r.top) / r.height));
      el.style.setProperty('--p', reducedMotion ? '1' : p.toFixed(4));
      const y = p * 1000;
      const next = reducedMotion ? PINS.length - 1 : PINS.reduce((acc, pin, i) => (y >= pin - 70 ? i : acc), -1);
      setReached((prev) => (prev === next ? prev : next));
      el.style.setProperty('--vy', `${(p * 100).toFixed(2)}%`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  // A little celebration when the last chapter lands.
  useEffect(() => {
    if (reached === 3 && !burstOnce.current && !reducedMotion) {
      burstOnce.current = true;
      const el = sec.current?.querySelector<HTMLElement>('[data-arrive]');
      const r = el?.getBoundingClientRect();
      if (r) burst(r.left + r.width / 2, r.top + r.height / 2);
    }
  }, [reached, reducedMotion]);

  return (
    <section ref={sec} className={`${b.section} ${s.section}`} id="story" aria-labelledby="story-title">
      <div className={s.decor} aria-hidden="true">
        <i className={`${s.d} ${s.d1}`} />
        <i className={`${s.d} ${s.d2}`} />
        <svg className={`${s.d} ${s.d3}`} viewBox="0 0 24 24">
          <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" />
        </svg>
      </div>

      <div className={b.wrap}>
        <Reveal>
          <span className={b.kicker}>The story of a gala</span>
          <h2 id="story-title" className={b.h2}>
            From “G tayo?”
            <br />
            to <span className={s.zest}>“OTW na.”</span>
          </h2>
        </Reveal>

        <div className={s.track} data-track>
          <svg className={s.line} viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
            <path d={PATH} className={s.lineBase} vectorEffect="non-scaling-stroke" />
            <path d={PATH} pathLength={1} className={s.lineFill} vectorEffect="non-scaling-stroke" />
          </svg>
          <span className={s.rider} aria-hidden="true">
            <Icon name="nav" size={16} />
          </span>

          <ol className={s.chapters}>
            {CHAPTERS.map((ch, i) => {
              const on = reached >= i;
              return (
                <li key={ch.n} className={`${s.chapter} ${i % 2 ? s.right : s.left} ${on ? s.in : ''}`}>
                  <span className={s.pin} aria-hidden="true">
                    {ch.n}
                  </span>
                  <div className={s.card}>
                    <h3>{ch.title}</h3>
                    <p>{ch.text}</p>
                    <div className={s.visual} {...(i === 3 ? { 'data-arrive': true } : {})}>
                      {i === 0 && <Calendar on={on} />}
                      {i === 1 && <WhosG on={on} />}
                      {i === 2 && <Route on={on} />}
                      {i === 3 && <Arrive on={on} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <Wave top="var(--teal-dark)" bottom="var(--blossom)" />
    </section>
  );
}
