/**
 * The tour's phone screens: small, made-up reproductions of real OTW screens in plain DOM + inline SVG.
 * They hold no data and no logic. Every scene's base CSS is its FINISHED picture; the animations (in
 * walkthrough.module.css) only play "from" the starting state while the scene is on, which is also why the
 * reduced-motion version is just the same markup with the animations switched off.
 * Each scene is one function, so a step can be shortened or removed without touching the others.
 */
import type { CSSProperties, ReactNode } from 'react';
import s from './walkthrough.module.css';

/** Sets the per-element animation delay the CSS reads. */
export const d = (sec: number) => ({ '--d': `${sec}s` }) as CSSProperties;

export type Tone = 'rosy' | 'teal' | 'zest' | 'blossom';

export function Av({ n, tone, size = 30 }: { n: string; tone: Tone; size?: number }) {
  return (
    <i className={`${s.av} ${s[`av_${tone}`]}`} style={{ width: size, height: size, fontSize: size * 0.46 }}>
      {n}
    </i>
  );
}

export function Bar({ title }: { title: string }) {
  return (
    <div className={s.bar}>
      <b>{title}</b>
    </div>
  );
}

/** The app's three-button bottom nav (Home, Chat, Map), so the phone screens read like the real thing. */
export function NavBar({ on }: { on: 'home' | 'chat' | 'map' }) {
  const items: ['home' | 'chat' | 'map', ReactNode][] = [
    ['home', <path key="h" d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM10 21v-6h4v6" />],
    ['chat', <path key="c" d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />],
    ['map', <path key="m" d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />],
  ];
  return (
    <div className={s.navBar}>
      {items.map(([k, icon]) => (
        <i key={k} className={`${s.navBtn} ${k === on ? s.navOn : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </i>
      ))}
    </div>
  );
}

export const Check = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/* ---- 1. Plan a gala: a name, a date, "Tara G!", then the code ---- */
export function PlanScene() {
  const code = 'OTW-7K2P-ABCD'.split('');
  return (
    <div className={s.body}>
      <Bar title="Plan a Gala" />
      <p className={s.q}>Anong gala &apos;to?</p>
      <div className={s.input}>
        <span className={s.type} style={d(0.3)}>
          Tagaytay barkada
        </span>
      </div>
      <div className={s.row}>
        <span className={`${s.chip} ${s.pop}`} style={d(1.5)}>
          Oct 24–25
        </span>
        <span className={`${s.chip} ${s.pop}`} style={d(1.7)}>
          Tagaytay
        </span>
      </div>
      <button type="button" tabIndex={-1} className={`${s.cta1} ${s.press}`} style={d(2.0)}>
        Tara G!
      </button>
      <div className={`${s.codeCard} ${s.slide}`} style={d(2.5)}>
        <span>Gala code</span>
        <b className={s.code}>
          {code.map((c, i) => (
            <em key={i} className={s.ch} style={d(2.7 + i * 0.06)}>
              {c}
            </em>
          ))}
        </b>
        <div className={s.joined}>
          {(['A', 'B', 'C'] as const).map((n, i) => (
            <span key={n} className={s.pop} style={d(3.5 + i * 0.18)}>
              <Av n={n} tone={(['rosy', 'teal', 'zest'] as const)[i]} size={26} />
            </span>
          ))}
          <small className={`${s.fade}`} style={d(4.1)}>
            3 joined
          </small>
        </div>
      </div>
    </div>
  );
}

/* ---- 2. Who's G?: tiles flip to "I'm G" and the counts tick ---- */
const PEOPLE: { n: string; name: string; tone: Tone }[] = [
  { n: 'A', name: 'Ana', tone: 'rosy' },
  { n: 'B', name: 'Ben', tone: 'teal' },
  { n: 'C', name: 'Cai', tone: 'zest' },
  { n: 'D', name: 'Dani', tone: 'blossom' },
];
const FLIP_AT = [0.5, 1.1, 1.75];

export function WhosGScene() {
  return (
    <div className={s.body}>
      <Bar title="Who's G?" />
      <div className={s.tiles3}>
        <div className={`${s.tile} ${s.tileG}`}>
          <span className={s.digits}>
            <span className={`${s.col} ${s.countUp}`}>
              <i>0</i>
              <i>1</i>
              <i>2</i>
              <i>3</i>
            </span>
          </span>
          <small>I&apos;m G</small>
        </div>
        <div className={`${s.tile} ${s.tileM}`}>
          <span className={s.digits}>
            <span className={`${s.col} ${s.countDown}`}>
              <i>4</i>
              <i>3</i>
              <i>2</i>
              <i>1</i>
            </span>
          </span>
          <small>Maybe</small>
        </div>
        <div className={`${s.tile} ${s.tileX}`}>
          <span className={s.digits}>
            <span className={s.col} style={{ transform: 'none' }}>
              <i>0</i>
            </span>
          </span>
          <small>Can&apos;t</small>
        </div>
      </div>
      <ul className={s.people}>
        {PEOPLE.map((p, i) => {
          const goes = i < 3;
          return (
            <li key={p.name}>
              <Av n={p.n} tone={p.tone} />
              <b>{p.name}</b>
              <span className={s.statusWrap}>
                <span className={`${s.status} ${s.maybe}${goes ? ` ${s.maybeOut}` : ''}`} style={goes ? d(FLIP_AT[i]) : undefined}>
                  Maybe
                </span>
                {goes && (
                  <span className={`${s.status} ${s.flip}`} style={d(FLIP_AT[i])}>
                    <Check size={12} /> I&apos;m G
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <NavBar on="home" />
    </div>
  );
}

/* ---- 3. The plan: pins drop on a mini map and the route draws in ---- */
export function RouteScene() {
  const stops: [string, string, number][] = [
    ['Meet-up', '6:00 AM', 1.0],
    ['Food', 'Bulalo stop', 1.6],
    ['Activity', 'Taal view', 2.2],
  ];
  return (
    <div className={s.body}>
      <Bar title="The plan" />
      <div className={s.map} role="presentation">
        <svg viewBox="0 0 220 150" width="100%" height="100%" aria-hidden="true">
          <rect width="220" height="150" className={s.mapBg} />
          <path d="M0 118c30-14 54 6 84-8s56-30 90-22 34 18 46 14v48H0z" className={s.mapWater} />
          <path d="M-5 40 70 62 150 30 225 52M40 -5 58 155M130 -5 150 155" className={s.mapRoad} />
          <path d="M30 112 C 62 80, 70 98, 108 68 S 168 52, 190 36" pathLength={1} className={`${s.routeLine} ${s.draw}`} style={d(0.7)} />
          {[
            [30, 112],
            [108, 68],
            [190, 36],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g className={`${s.pin} ${s.dropIn}`} style={d(0.3 + i * 0.6)}>
                <path d="M0 0c-9-11-12-17-12-23a12 12 0 0 1 24 0c0 6-3 12-12 23z" className={s.pinBody} />
                <text x="0" y="-17" textAnchor="middle" className={s.pinNum}>
                  {i + 1}
                </text>
              </g>
            </g>
          ))}
        </svg>
      </div>
      <ul className={s.stops}>
        {stops.map(([type, what, at], i) => (
          <li key={type} className={s.slide} style={d(at)}>
            <b className={s.stopN}>{i + 1}</b>
            <span>
              <em>{type}</em> {what}
            </span>
          </li>
        ))}
      </ul>
      <NavBar on="home" />
    </div>
  );
}

/* ---- 4. Ambagan: amounts add up, then "who owes whom" settles ---- */
export function AmbaganScene() {
  const owes = ['Ben', 'Cai', 'Dani'];
  return (
    <div className={s.body}>
      <Bar title="Ambagan" />
      <ul className={s.exp}>
        {(
          [
            ['Gas', '₱800', 0.2],
            ['Food', '₱1,240', 0.5],
            ['Entrance', '₱600', 0.8],
          ] as const
        ).map(([what, amt, at]) => (
          <li key={what} className={s.slide} style={d(at)}>
            <span>{what}</span>
            <b>{amt}</b>
          </li>
        ))}
      </ul>
      <div className={`${s.total} ${s.slide}`} style={d(0.2)}>
        <span>Total</span>
        <b className={s.sums}>
          <i className={`${s.sum} ${s.sum1}`}>₱800</i>
          <i className={`${s.sum} ${s.sum2}`}>₱2,040</i>
          <i className={`${s.sum} ${s.sum3}`}>₱2,640</i>
        </b>
      </div>
      <div className={`${s.settle} ${s.slide}`} style={d(1.4)}>
        <span className={s.settleHd}>Who owes whom</span>
        {owes.map((n, i) => (
          <div key={n} className={`${s.owe} ${s.slide}`} style={d(1.6 + i * 0.2)}>
            <span>
              {n} → Ana <b>₱660</b>
            </span>
            <span className={s.payWrap}>
              <i className={`${s.pay} ${s.payOut}`} style={d(2.5 + i * 0.2)}>
                Mark paid
              </i>
              <i className={`${s.paid} ${s.payIn}`} style={d(2.5 + i * 0.2)}>
                <Check size={12} /> Paid
              </i>
            </span>
          </div>
        ))}
        <div className={`${s.allSet} ${s.pop}`} style={d(3.3)}>
          <Check size={16} /> All settled
        </div>
      </div>
      <NavBar on="home" />
    </div>
  );
}

/* ---- 5. Chat: bubbles arrive, a plan change shows up as a card, a heart pops ---- */
export function ChatScene() {
  return (
    <div className={s.body}>
      <Bar title="Chismis" />
      <div className={s.chat}>
        <div className={`${s.msg} ${s.slide}`} style={d(0.1)}>
          <Av n="A" tone="rosy" size={24} />
          <p>Taal view?</p>
        </div>
        <div className={`${s.msg} ${s.slide}`} style={d(0.5)}>
          <Av n="B" tone="teal" size={24} />
          <p>Who has a car?</p>
        </div>
        <div className={s.slot}>
          <div className={`${s.typing} ${s.dotsFlash}`} style={d(0.9)} aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className={`${s.msg} ${s.me} ${s.slide}`} style={d(1.6)}>
            <p>
              Me! Friday.
              <span className={`${s.react} ${s.pop}`} style={d(3.2)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
                </svg>
                2
              </span>
            </p>
          </div>
        </div>
        <div className={`${s.sys} ${s.slide}`} style={d(2.2)}>
          Ana added a stop: Taal view
        </div>
        <div className={`${s.msg} ${s.slide}`} style={d(2.7)}>
          <Av n="C" tone="zest" size={24} />
          <p>G!!</p>
        </div>
      </div>
      <NavBar on="chat" />
    </div>
  );
}
