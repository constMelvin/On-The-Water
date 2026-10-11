'use client';

/* Little animated scenes for the roadmap stops. They sit in their finished state and replay whenever their stop becomes the active one. */
import type { CSSProperties } from 'react';
import s from './RoadArt.module.css';

const d = (i: number, step = 0.3, base = 0.15) => ({ '--d': `${base + i * step}s` }) as CSSProperties;

function DateArt() {
  return (
    <div className={s.days}>
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => (
        <span key={i} className={i === 5 ? s.pick : ''}>
          {x}
        </span>
      ))}
      <em className={s.stamp}>Sat. G!</em>
    </div>
  );
}

function WhosGArt() {
  const people = [
    ['A', s.tRosy],
    ['B', s.tTeal],
    ['C', s.tZest],
    ['D', s.tBlossom],
  ] as const;
  return (
    <div className={s.gRow}>
      {people.map(([n, tone], i) => (
        <span key={n} className={s.gItem}>
          <i className={`${s.av} ${tone}`}>{n}</i>
          <span className={s.flip} style={d(i, 0.38, 0.35)}>
            <b className={s.faceA}>Maybe</b>
            <b className={s.faceB}>I&apos;m G</b>
          </span>
        </span>
      ))}
    </div>
  );
}

function RouteArt() {
  const pins = [
    [10, 40],
    [100, 18],
    [190, 36],
  ];
  return (
    <svg className={s.route} viewBox="0 0 200 54" aria-hidden="true">
      <path className={s.rPath} pathLength={1} d="M10 40 C 40 40, 60 14, 100 18 S 160 44, 190 36" />
      {pins.map(([x, y], i) => (
        <g key={i} className={s.rPin} transform={`translate(${x} ${y})`} style={d(i, 0.45, 0.2)}>
          <circle r="8" />
          <text y="3.5" textAnchor="middle">
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

function MoneyArt() {
  return (
    <div className={s.money}>
      <span className={s.coins} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <i key={i} style={d(i, 0.2, 0.2)} />
        ))}
      </span>
      <b className={s.amount}>₱2,640</b>
      <em className={s.each}>₱660 each</em>
    </div>
  );
}

function PackArt() {
  return (
    <ul className={s.pack}>
      {['Tent', 'Speaker', 'Charger'].map((t, i) => (
        <li key={t} style={d(i, 0.4, 0.3)}>
          <i>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </i>
          {t}
        </li>
      ))}
    </ul>
  );
}

function ChatArt() {
  return (
    <div className={s.chat}>
      <p className={s.b1} style={d(0, 0, 0.2)}>
        G tayo?
      </p>
      <p className={s.b2} style={d(0, 0, 0.8)}>
        I&apos;m G!
      </p>
      <p className={s.dots} style={d(0, 0, 1.4)} aria-hidden="true">
        <i />
        <i />
        <i />
      </p>
    </div>
  );
}

function PinArt() {
  return (
    <div className={s.where}>
      <span className={s.track} />
      <span className={s.mover}>
        <i className={s.ping} />
        <i className={s.me}>A</i>
      </span>
      <span className={s.dest}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 21s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" />
          <circle cx="12" cy="9" r="2.6" fill="var(--cream)" />
        </svg>
      </span>
    </div>
  );
}

const ARTS = [DateArt, WhosGArt, RouteArt, MoneyArt, PackArt, ChatArt, PinArt];

export function StopArt({ i, playing }: { i: number; playing: boolean }) {
  const Art = ARTS[i];
  if (!Art) return null;
  return (
    <div className={`${s.art} ${playing ? s.play : ''}`} aria-hidden="true">
      <Art />
    </div>
  );
}
