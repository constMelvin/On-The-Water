'use client';

import { useState, type CSSProperties } from 'react';
import { burst } from '@/lib/otw/feedback';
import { Av, Icon, PEOPLE, Reveal, Wave } from './kit';
import b from './base.module.css';
import f from './features.module.css';

function WhosGTile() {
  const [going, setGoing] = useState<boolean[]>([true, false, true, false]);
  const n = going.filter(Boolean).length;
  return (
    <article className={`${f.tile} ${f.g}`}>
      <span className={f.tag}>Attendance</span>
      <h3>Who&apos;s G?</h3>
      <p>Tap a name to flip them to I&apos;m G. Live headcount, no more “seen.”</p>
      <ul className={f.people}>
        {PEOPLE.map((p, i) => (
          <li key={p.name}>
            <button type="button" className={`${f.person} ${going[i] ? f.yes : ''}`} aria-pressed={going[i]} onClick={() => setGoing((g) => g.map((v, k) => (k === i ? !v : v)))}>
              <Av n={p.n} tone={p.tone} size={44} />
              <b>{p.name}</b>
              <span className={f.flip}>
                <i className={f.faceA}>Maybe</i>
                <i className={f.faceB}>
                  <Icon name="check" size={13} /> I&apos;m G
                </i>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className={f.counter}>
        <b key={n}>{n}</b>
        <span>of 4 are G</span>
      </div>
    </article>
  );
}

function AmbaganTile() {
  return (
    <article className={`${f.tile} ${f.a}`}>
      <span className={f.tag}>Ambagan</span>
      <h3>Walang may habol.</h3>
      <div className={f.ticker} aria-hidden="true">
        <span className={f.t1}>₱2,640</span>
        <span className={f.t2}>₱660 each</span>
      </div>
      <p>Log who paid. See who owes whom. Mark paid.</p>
    </article>
  );
}

function LocationTile() {
  return (
    <article className={`${f.tile} ${f.l}`}>
      <span className={f.tag}>Live location</span>
      <h3>Who&apos;s OTW?</h3>
      <div className={f.radar} aria-hidden="true">
        <i className={f.r1} />
        <i className={f.r2} />
        <i className={f.r3} />
        <span className={f.me}>
          <Icon name="pin" size={20} />
        </span>
        {PEOPLE.slice(0, 3).map((p, i) => (
          <span key={p.name} className={`${f.orbit} ${f[`o${i}`]}`}>
            <Av n={p.n} tone={p.tone} size={30} />
          </span>
        ))}
      </div>
      <p>Opt-in only. See who&apos;s home, on the way, or already there.</p>
    </article>
  );
}

function PlanTile() {
  return (
    <article className={`${f.tile} ${f.p}`}>
      <span className={f.tag}>The plan</span>
      <h3>Stop by stop.</h3>
      <svg className={f.doodle} viewBox="0 0 260 90" aria-hidden="true">
        <path d="M14 70 C 60 70, 70 20, 120 40 S 190 80, 246 22" pathLength={1} className={f.dpath} />
        {[
          [14, 70],
          [120, 40],
          [246, 22],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`} className={f.dpin} style={{ '--i': i } as CSSProperties}>
            <circle r="9" />
            <text y="4" textAnchor="middle">
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      <p>Pin stops on a map and see the route.</p>
    </article>
  );
}

function DumpTile() {
  return (
    <article className={`${f.tile} ${f.d}`}>
      <span className={f.tag}>Gala Dump</span>
      <h3>Keep the memories.</h3>
      <div className={f.stack} aria-hidden="true">
        <i className={f.s1} />
        <i className={f.s2} />
        <i className={f.s3}>
          <Icon name="camera" size={22} />
        </i>
      </div>
      <p>Photos and videos from the whole barkada, in one folder.</p>
    </article>
  );
}

function CoupleTile() {
  return (
    <article className={`${f.tile} ${f.c}`}>
      <span className={f.tag}>Couple Mode</span>
      <h3>Just the two of you.</h3>
      <div className={f.pair} aria-hidden="true">
        <Av n="A" tone="rosy" size={46} />
        <span className={f.heart}>
          <Icon name="heart" size={18} />
        </span>
        <Av n="J" tone="teal" size={46} />
      </div>
      <ul className={f.bucket} aria-hidden="true">
        <li className={f.bDone}>
          <i>
            <Icon name="check" size={12} />
          </i>
          Watch the sunrise
        </li>
        <li className={f.bLater}>
          <i>
            <Icon name="check" size={12} />
          </i>
          Try a night market
        </li>
      </ul>
      <p>A bucket list for two, and more.</p>
    </article>
  );
}

function AwardsTile() {
  const [spin, setSpin] = useState(0);
  return (
    <article
      className={`${f.tile} ${f.w}`}
      onClick={(e) => {
        setSpin((n) => n + 1);
        const r = e.currentTarget.getBoundingClientRect();
        burst(r.left + r.width * 0.78, r.top + r.height * 0.45);
      }}
    >
      <span className={f.tag}>Barkada Awards</span>
      <h3>May trophy pa.</h3>
      <p>Vote anonymously, reveal the winners, and hand out certificates. Tap the trophy.</p>
      <div key={spin} className={f.trophy} aria-hidden="true">
        <svg viewBox="0 0 48 58" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6h24v14a12 12 0 0 1-24 0z" fill="var(--zest)" stroke="var(--teal-dark)" />
          <path d="M12 10H6a3 3 0 0 0-3 3c0 6 5 10 10 10M36 10h6a3 3 0 0 1 3 3c0 6-5 10-10 10" stroke="var(--teal-dark)" />
          <path d="M24 32v9M16 52h16M18 41h12l2 11H16z" fill="var(--zest)" stroke="var(--teal-dark)" />
          <path d="M24 11l1.4 4.1 4.1 1.4-4.1 1.4L24 22l-1.4-4.1-4.1-1.4 4.1-1.4z" fill="var(--rosy)" stroke="none" />
        </svg>
      </div>
    </article>
  );
}

export function Features() {
  return (
    <section className={`${b.section} ${f.section}`} id="features" aria-labelledby="features-title">
      <div className={b.wrap}>
        <Reveal>
          <span className={b.kicker}>What&apos;s inside</span>
          <h2 id="features-title" className={b.h2}>
            Everything a gala needs.
            <br />
            <span className={f.rose}>Nothing it doesn&apos;t.</span>
          </h2>
        </Reveal>
        <div className={f.bento}>
          <Reveal className={f.cellG}>
            <WhosGTile />
          </Reveal>
          <Reveal delay={0.08} className={f.cellA}>
            <AmbaganTile />
          </Reveal>
          <Reveal delay={0.12} className={f.cellL}>
            <LocationTile />
          </Reveal>
          <Reveal delay={0.16} className={f.cellP}>
            <PlanTile />
          </Reveal>
          <Reveal delay={0.05} className={f.cellD}>
            <DumpTile />
          </Reveal>
          <Reveal delay={0.1} className={f.cellC}>
            <CoupleTile />
          </Reveal>
          <Reveal delay={0.15} className={f.cellW}>
            <AwardsTile />
          </Reveal>
        </div>
      </div>
      <Wave top="var(--cream)" bottom="var(--rosy)" />
    </section>
  );
}
