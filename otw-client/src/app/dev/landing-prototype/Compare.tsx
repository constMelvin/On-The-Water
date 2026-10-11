'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { burst } from '@/lib/otw/feedback';
import { Av, Icon, PEOPLE, Reveal, Wave, useInView, useReduced, type Tone } from './kit';
import b from './base.module.css';
import c from './compare.module.css';

type Mode = 'without' | 'with';

type Item =
  | { kind: 'msg'; who: number; text: string }
  | { kind: 'seen'; text: string }
  | { kind: 'sys'; text: string }
  | { kind: 'card' }
  | { kind: 'end'; text: string };

const START: Item[] = [
  { kind: 'msg', who: 0, text: 'G tayo sa Tagaytay?' },
  { kind: 'msg', who: 1, text: 'G!! Kailan?' },
  { kind: 'msg', who: 2, text: 'Weekend siguro' },
  { kind: 'msg', who: 3, text: 'Sige sige, update na lang' },
];

const SCRIPT: Record<Mode, Item[]> = {
  without: [
    ...START,
    { kind: 'msg', who: 0, text: 'Sino may sasakyan?' },
    { kind: 'msg', who: 1, text: 'Basta soon' },
    { kind: 'seen', text: 'Seen by 3' },
    { kind: 'sys', text: '3 weeks later…' },
    { kind: 'msg', who: 0, text: 'Uy G pa ba tayo?' },
    { kind: 'msg', who: 3, text: 'Next time na lang?' },
    { kind: 'end', text: 'The gala never happened.' },
  ],
  with: [
    ...START,
    { kind: 'msg', who: 0, text: 'Gawa ko na sa OTW. Check niyo.' },
    { kind: 'card' },
    { kind: 'msg', who: 1, text: 'I’m G!' },
    { kind: 'msg', who: 2, text: 'Ako bahala sa speaker' },
    { kind: 'msg', who: 3, text: 'Sama ako sa sasakyan ni Ana' },
    { kind: 'sys', text: 'Saturday, 6:00 AM · everyone’s G' },
    { kind: 'end', text: 'OTW na.' },
  ],
};

const COPY: Record<Mode, { title: string; text: string; chips: string[] }> = {
  without: {
    title: 'Everyone’s G. Nobody’s in charge.',
    text: 'No date, no plan, no budget. Just a chat that fades into “seen.”',
    chips: ['No date', 'No plan', 'No ambagan'],
  },
  with: {
    title: 'One link. One plan.',
    text: 'The date, the route, the checklist and who’s G, all in one place the whole barkada can see.',
    chips: ['Date locked', 'Route set', 'Everyone’s in'],
  },
};

/** The gala card the "with OTW" chat drops in; its counts follow how far the conversation has gone. */
function GalaCard({ shown }: { shown: number }) {
  const going = 1 + (shown >= 6 ? 1 : 0) + (shown >= 7 ? 1 : 0) + (shown >= 8 ? 1 : 0);
  const packed = (shown >= 7 ? 1 : 0) + (shown >= 8 ? 1 : 0) + (shown >= 9 ? 1 : 0);
  return (
    <div className={c.card}>
      <header>
        <b>Tagaytay Barkada</b>
        <span>
          <Icon name="calendar" size={14} /> Sat, Oct 24 · 6:00 AM
        </span>
      </header>
      <div className={c.cardRow}>
        <span className={c.cardLabel}>Who&apos;s G?</span>
        <span className={c.goingAvs}>
          {PEOPLE.map((p, i) => (
            <span key={p.name} className={`${c.goingAv} ${i < going ? c.on : ''}`}>
              <Av n={p.n} tone={p.tone} size={26} />
            </span>
          ))}
        </span>
        <em className={c.count}>{going}/4</em>
      </div>
      <ul className={c.stops}>
        {[
          ['6:00', 'Meet-up · Cubao'],
          ['9:30', 'Food · Bulalo stop'],
          ['1:00', 'Activity · Taal view'],
        ].map(([t, w], i) => (
          <li key={t} style={{ '--i': i } as CSSProperties}>
            <b>{t}</b> {w}
          </li>
        ))}
      </ul>
      <div className={c.cardRow}>
        <span className={c.cardLabel}>Checklist</span>
        <span className={c.bar}>
          <i style={{ transform: `scaleX(${packed / 3})` }} />
        </span>
        <em className={c.count}>{packed}/3</em>
      </div>
    </div>
  );
}

export function Compare() {
  const [mode, setMode] = useState<Mode>('without');
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState<number | null>(null);
  const [run, setRun] = useState(0);
  const [ref, inView] = useInView<HTMLDivElement>({ once: true, margin: '0px 0px -25% 0px' });
  const reduced = useReduced();
  const scroller = useRef<HTMLDivElement>(null);
  const script = SCRIPT[mode];

  // Play the conversation one message at a time (with a typing bubble before each person's message).
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      const t = setTimeout(() => setShown(script.length), 0);
      return () => clearTimeout(t);
    }
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    timers.push(setTimeout(() => alive && setShown(0), 0));
    script.forEach((item, i) => {
      if (item.kind === 'msg') {
        at += 500;
        timers.push(setTimeout(() => alive && setTyping(item.who), at));
        at += 750;
      } else {
        at += 700;
      }
      timers.push(
        setTimeout(() => {
          if (!alive) return;
          setTyping(null);
          setShown(i + 1);
          if (item.kind === 'end' && mode === 'with') {
            const r = scroller.current?.getBoundingClientRect();
            if (r) burst(r.left + r.width / 2, r.bottom - 40);
          }
        }, at)
      );
    });
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [inView, mode, run, reduced, script]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [shown, typing, reduced]);

  const pick = useCallback(
    (m: Mode) => {
      if (m === mode) return;
      setTyping(null);
      setShown(0);
      setMode(m);
    },
    [mode]
  );

  const visible = script.slice(0, shown);
  const done = shown >= script.length;

  return (
    <section className={`${b.section} ${c.section}`} id="compare" aria-labelledby="compare-title">
      <div className={b.wrap}>
        <Reveal>
          <span className={b.kicker}>Same group chat</span>
          <h2 id="compare-title" className={b.h2}>
            Two endings.
            <br />
            <span className={c.rose}>You pick.</span>
          </h2>
        </Reveal>

        <div ref={ref} className={c.grid}>
          <div className={c.left}>
            <div className={c.toggle} role="group" aria-label="Show the chat without or with OTW">
              <span className={c.thumb} style={{ transform: mode === 'with' ? 'translateX(100%)' : 'none' }} aria-hidden="true" />
              <button type="button" aria-pressed={mode === 'without'} onClick={() => pick('without')}>
                Without OTW
              </button>
              <button type="button" aria-pressed={mode === 'with'} onClick={() => pick('with')}>
                With OTW
              </button>
            </div>

            <div className={`${c.phone} ${mode === 'with' ? c.phoneWith : ''}`}>
              <div className={c.phoneBar}>
                <b>Tagaytay??</b>
                <span>4 people</span>
              </div>
              <div ref={scroller} className={c.feed} aria-live="polite">
                {visible.map((it, i) => {
                  if (it.kind === 'msg') {
                    const p = PEOPLE[it.who];
                    return (
                      <div key={`${mode}-${i}`} className={`${c.msg} ${it.who === 0 ? c.me : ''}`}>
                        {it.who !== 0 && <Av n={p.n} tone={p.tone as Tone} size={26} />}
                        <p>
                          <small>{p.name}</small>
                          {it.text}
                        </p>
                      </div>
                    );
                  }
                  if (it.kind === 'card') {
                    return (
                      <div key={`${mode}-${i}`} className={c.cardWrap}>
                        <GalaCard shown={shown} />
                      </div>
                    );
                  }
                  if (it.kind === 'seen') {
                    return (
                      <p key={`${mode}-${i}`} className={c.seen}>
                        <Icon name="check" size={12} /> {it.text}
                      </p>
                    );
                  }
                  if (it.kind === 'sys') {
                    return (
                      <p key={`${mode}-${i}`} className={c.sys}>
                        {it.text}
                      </p>
                    );
                  }
                  return (
                    <p key={`${mode}-${i}`} className={`${c.end} ${mode === 'with' ? c.endGood : c.endBad}`}>
                      {mode === 'with' ? <Icon name="sparkle" size={16} /> : <Icon name="x" size={16} />} {it.text}
                    </p>
                  );
                })}
                {typing !== null && (
                  <div className={`${c.msg} ${typing === 0 ? c.me : ''}`}>
                    {typing !== 0 && <Av n={PEOPLE[typing].n} tone={PEOPLE[typing].tone} size={26} />}
                    <p className={c.typing} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={c.right}>
            <div key={mode} className={c.copy}>
              <h3>{COPY[mode].title}</h3>
              <p>{COPY[mode].text}</p>
              <ul className={c.chips}>
                {COPY[mode].chips.map((t, i) => (
                  <li key={t} style={{ '--i': i } as CSSProperties}>
                    {mode === 'with' ? <Icon name="check" size={15} /> : <Icon name="x" size={15} />} {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className={c.actions}>
              <button type="button" className={`${b.btn} ${b.btnSm} ${mode === 'with' ? b.btnTeal : b.btnCream}`} onClick={() => setRun((n) => n + 1)} disabled={!done && !reduced}>
                <Icon name="route" size={16} /> Replay
              </button>
              {mode === 'without' && (
                <button type="button" className={`${b.btn} ${b.btnSm}`} onClick={() => pick('with')}>
                  See it with OTW <Icon name="arrow" size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <Wave top="var(--cream)" bottom="var(--teal-dark)" />
    </section>
  );
}
