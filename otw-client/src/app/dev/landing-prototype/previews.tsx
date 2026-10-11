'use client';

/** The six clickable dashboard previews. Mock data and local state only: nothing is saved anywhere. */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { burst } from '@/lib/otw/feedback';
import { Av, Icon, PEOPLE } from './kit';
import p from './previews.module.css';

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

/* ================================================================ */
/*  Itinerary                                                        */
/* ================================================================ */

interface Stop {
  id: number;
  time: string;
  type: 'Meet-up' | 'Food' | 'Activity';
  title: string;
}

/** Where each stop's pin goes on the mini map (a 360 x 250 drawing). */
const SPOTS: [number, number][] = [
  [40, 200],
  [100, 140],
  [160, 170],
  [210, 100],
  [270, 130],
  [310, 60],
  [230, 40],
  [120, 50],
];

const TIMES = ['6:00 AM', '9:30 AM', '11:00 AM', '1:00 PM', '3:30 PM', '5:30 PM', '7:00 PM', '9:00 PM'];

function routePath(points: [number, number][]) {
  if (points.length < 2) return '';
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export function ItineraryPreview() {
  const [stops, setStops] = useState<Stop[]>([
    { id: 1, time: TIMES[0], type: 'Meet-up', title: 'Cubao terminal' },
    { id: 2, time: TIMES[1], type: 'Food', title: 'Bulalo stop' },
    { id: 3, time: TIMES[2], type: 'Activity', title: 'Taal view deck' },
  ]);
  const [sel, setSel] = useState(1);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Stop['type']>('Food');
  const nextId = useRef(4);

  const points = stops.map((_, i) => SPOTS[i]);
  const d = routePath(points);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || stops.length >= SPOTS.length) return;
    const id = nextId.current++;
    setStops((s) => [...s, { id, time: TIMES[s.length], type, title: title.trim().slice(0, 28) }]);
    setSel(id);
    setTitle('');
  };

  return (
    <div className={p.split}>
      <div className={p.col}>
        <h4 className={p.h}>The plan</h4>
        <ol className={p.stops}>
          {stops.map((s, i) => (
            <li key={s.id}>
              <button type="button" className={`${p.stop} ${sel === s.id ? p.stopOn : ''}`} onClick={() => setSel(s.id)} aria-pressed={sel === s.id}>
                <i className={p.stopN}>{i + 1}</i>
                <span>
                  <b>{s.title}</b>
                  <small>
                    {s.time} · {s.type}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <form className={p.addRow} onSubmit={add}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={stops.length >= SPOTS.length ? 'Plan is full' : 'Add a stop…'} aria-label="Stop name" maxLength={28} disabled={stops.length >= SPOTS.length} />
          <select value={type} onChange={(e) => setType(e.target.value as Stop['type'])} aria-label="Stop type">
            <option>Food</option>
            <option>Activity</option>
            <option>Meet-up</option>
          </select>
          <button type="submit" className={p.round} aria-label="Add stop" disabled={!title.trim() || stops.length >= SPOTS.length}>
            <Icon name="plus" size={18} />
          </button>
        </form>
      </div>

      <div className={p.mapBox}>
        <svg viewBox="0 0 360 250" className={p.mapSvg} role="img" aria-label="Map of the route">
          <rect width="360" height="250" className={p.mapBg} />
          <path d="M0 200c40-22 80 8 120-8s90-40 140-24 70 24 100 14v68H0z" className={p.water} />
          <path d="M-5 90 120 120 240 70 365 100M70 -5 90 255M220 -5 240 255" className={p.road} />
          {d && <path key={stops.length} d={d} pathLength={1} className={p.route} />}
          {points.map(([x, y], i) => (
            <g key={stops[i].id} transform={`translate(${x} ${y})`} className={`${p.pin} ${sel === stops[i].id ? p.pinOn : ''}`} onClick={() => setSel(stops[i].id)}>
              <g className={p.pinDrop}>
                <path d="M0 0c-10-12-13-19-13-25a13 13 0 0 1 26 0c0 6-3 13-13 25z" />
                <text y="-19" textAnchor="middle">
                  {i + 1}
                </text>
              </g>
            </g>
          ))}
        </svg>
        <span className={p.mapTag}>
          <Icon name="route" size={14} /> {stops.length} stops
        </span>
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Budget and ambagan                                               */
/* ================================================================ */

type Cat = 'Food' | 'Gas' | 'Activities' | 'Other';
const BUDGETS: Record<Cat, number> = { Food: 3000, Gas: 1800, Activities: 1500, Other: 700 };

interface Expense {
  id: number;
  what: string;
  amt: number;
  by: number;
  cat: Cat;
}

interface Transfer {
  from: number;
  to: number;
  amt: number;
}

/** Who owes whom: everyone pays an equal share, the biggest debtor settles with the biggest creditor first. */
function settle(expenses: Expense[]): { share: number; total: number; transfers: Transfer[] } {
  const total = expenses.reduce((a, e) => a + e.amt, 0);
  const share = total / PEOPLE.length;
  const net = PEOPLE.map((_, i) => expenses.filter((e) => e.by === i).reduce((a, e) => a + e.amt, 0) - share);
  const debtors = net.map((n, i) => ({ i, n })).filter((x) => x.n < -0.5).sort((a, b) => a.n - b.n);
  const creditors = net.map((n, i) => ({ i, n })).filter((x) => x.n > 0.5).sort((a, b) => b.n - a.n);
  const transfers: Transfer[] = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const pay = Math.min(-debtors[di].n, creditors[ci].n);
    transfers.push({ from: debtors[di].i, to: creditors[ci].i, amt: Math.round(pay) });
    debtors[di].n += pay;
    creditors[ci].n -= pay;
    if (debtors[di].n > -0.5) di++;
    if (creditors[ci].n < 0.5) ci++;
  }
  return { share, total, transfers };
}

export function BudgetPreview() {
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: 1, what: 'Gas and tolls', amt: 1200, by: 0, cat: 'Gas' },
    { id: 2, what: 'Bulalo lunch', amt: 1480, by: 1, cat: 'Food' },
    { id: 3, what: 'Entrance fees', amt: 600, by: 0, cat: 'Activities' },
  ]);
  const [what, setWhat] = useState('');
  const [amt, setAmt] = useState('');
  const [by, setBy] = useState(0);
  const [cat, setCat] = useState<Cat>('Food');
  const [paid, setPaid] = useState<Record<string, boolean>>({});
  const nextId = useRef(4);
  const box = useRef<HTMLDivElement>(null);

  const { share, total, transfers } = useMemo(() => settle(expenses), [expenses]);
  const spent = (c: Cat) => expenses.filter((e) => e.cat === c).reduce((a, e) => a + e.amt, 0);
  const keyOf = (t: Transfer) => `${t.from}-${t.to}-${t.amt}`;
  const allPaid = transfers.length > 0 && transfers.every((t) => paid[keyOf(t)]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amt);
    if (!what.trim() || !Number.isFinite(n) || n <= 0) return;
    setExpenses((x) => [...x, { id: nextId.current++, what: what.trim().slice(0, 24), amt: Math.min(n, 99999), by, cat }]);
    setWhat('');
    setAmt('');
  };

  const mark = (t: Transfer, el: HTMLElement) => {
    const k = keyOf(t);
    const next = { ...paid, [k]: !paid[k] };
    setPaid(next);
    if (transfers.every((x) => next[keyOf(x)])) {
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top);
    }
  };

  return (
    <div className={p.split} ref={box}>
      <div className={p.col}>
        <h4 className={p.h}>Gastos</h4>
        <ul className={p.bars}>
          {(Object.keys(BUDGETS) as Cat[]).map((c) => {
            const s = spent(c);
            const over = s > BUDGETS[c];
            return (
              <li key={c}>
                <span>
                  <b>{c}</b>
                  <small className={over ? p.over : ''}>
                    {peso(s)} / {peso(BUDGETS[c])}
                  </small>
                </span>
                <i className={p.track}>
                  <i className={`${p.fill} ${over ? p.fillOver : ''}`} style={{ transform: `scaleX(${Math.min(1, s / BUDGETS[c])})` }} />
                </i>
              </li>
            );
          })}
        </ul>

        <form className={p.expForm} onSubmit={add}>
          <input value={what} onChange={(e) => setWhat(e.target.value)} placeholder="What was it?" aria-label="Expense" maxLength={24} />
          <input value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d.]/g, ''))} placeholder="₱0" inputMode="decimal" aria-label="Amount" className={p.amt} />
          <select value={by} onChange={(e) => setBy(Number(e.target.value))} aria-label="Paid by">
            {PEOPLE.map((x, i) => (
              <option key={x.name} value={i}>
                {x.name} paid
              </option>
            ))}
          </select>
          <select value={cat} onChange={(e) => setCat(e.target.value as Cat)} aria-label="Category">
            {(Object.keys(BUDGETS) as Cat[]).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button type="submit" className={p.round} aria-label="Add expense" disabled={!what.trim() || !Number(amt)}>
            <Icon name="plus" size={18} />
          </button>
        </form>
      </div>

      <div className={p.col}>
        <h4 className={p.h}>Ambagan</h4>
        <div className={p.totals}>
          <span>
            <small>Total</small>
            <b>{peso(total)}</b>
          </span>
          <span>
            <small>Each of 4</small>
            <b>{peso(share)}</b>
          </span>
        </div>
        <ul className={p.owe}>
          {transfers.length === 0 && <li className={p.empty}>Everyone&apos;s even.</li>}
          {transfers.map((t) => {
            const k = keyOf(t);
            return (
              <li key={k} className={paid[k] ? p.settled : ''}>
                <Av n={PEOPLE[t.from].n} tone={PEOPLE[t.from].tone} size={26} />
                <span>
                  {PEOPLE[t.from].name} → {PEOPLE[t.to].name} <b>{peso(t.amt)}</b>
                </span>
                <button type="button" className={p.mark} onClick={(e) => mark(t, e.currentTarget)} aria-pressed={!!paid[k]}>
                  {paid[k] ? (
                    <>
                      <Icon name="check" size={13} /> Paid
                    </>
                  ) : (
                    'Mark paid'
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {allPaid && (
          <p className={p.allSet}>
            <Icon name="sparkle" size={16} /> All settled. Walang may habol.
          </p>
        )}
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Checklist                                                        */
/* ================================================================ */

interface Item {
  id: number;
  label: string;
  by: number | null;
  done: boolean;
}

export function ChecklistPreview() {
  const [items, setItems] = useState<Item[]>([
    { id: 1, label: 'Bluetooth speaker', by: 2, done: true },
    { id: 2, label: 'Power bank and charger', by: null, done: false },
    { id: 3, label: 'Picnic mat', by: 3, done: false },
    { id: 4, label: 'Sunscreen and caps', by: null, done: false },
    { id: 5, label: 'Cooler with ice', by: 1, done: true },
  ]);
  const [label, setLabel] = useState('');
  const nextId = useRef(6);

  const done = items.filter((i) => i.done).length;
  const pct = items.length ? done / items.length : 0;

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setItems((x) => [...x, { id: nextId.current++, label: label.trim().slice(0, 30), by: null, done: false }]);
    setLabel('');
  };

  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className={p.split}>
      <div className={p.col}>
        <h4 className={p.h}>Checklist</h4>
        <ul className={p.checks}>
          {items.map((it) => (
            <li key={it.id} className={it.done ? p.itDone : ''}>
              <button type="button" className={p.cbox} role="checkbox" aria-checked={it.done} aria-label={it.label} onClick={() => setItems((x) => x.map((y) => (y.id === it.id ? { ...y, done: !y.done } : y)))}>
                <Icon name="check" size={16} />
              </button>
              <span className={p.itLabel}>{it.label}</span>
              {it.by !== null ? (
                <Av n={PEOPLE[it.by].n} tone={PEOPLE[it.by].tone} size={26} />
              ) : (
                <button type="button" className={p.claim} onClick={() => setItems((x) => x.map((y) => (y.id === it.id ? { ...y, by: 0 } : y)))}>
                  Claim
                </button>
              )}
            </li>
          ))}
        </ul>
        <form className={p.addRow} onSubmit={add}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add an item…" aria-label="New checklist item" maxLength={30} />
          <button type="submit" className={p.round} aria-label="Add item" disabled={!label.trim()}>
            <Icon name="plus" size={18} />
          </button>
        </form>
      </div>
      <div className={`${p.col} ${p.center}`}>
        <svg width="120" height="120" viewBox="0 0 80 80" className={p.ring} role="img" aria-label={`${done} of ${items.length} packed`}>
          <circle cx="40" cy="40" r={R} className={p.ringBg} />
          <circle cx="40" cy="40" r={R} className={p.ringFill} strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 40 40)" />
        </svg>
        <b className={p.ringText}>
          {done}/{items.length}
        </b>
        <small className={p.ringLabel}>packed</small>
        <p className={p.hint}>Claim an item so nobody brings three of the same.</p>
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Chat                                                             */
/* ================================================================ */

interface Msg {
  id: number;
  who: number | 'sys';
  text: string;
  hearts: number;
  liked: boolean;
}

const REPLIES: [number, string][] = [
  [1, 'G!!'],
  [2, 'Sige, ako bahala sa playlist'],
  [3, 'Sama ako sa sasakyan ni Ana'],
  [1, 'Saturday na saturday na'],
  [2, 'Magkano ambagan?'],
];

export function ChatPreview() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 1, who: 1, text: 'Sino may sasakyan?', hearts: 0, liked: false },
    { id: 2, who: 0, text: 'Ako! Friday.', hearts: 2, liked: false },
    { id: 3, who: 'sys', text: 'Ana added a stop: Taal view deck', hearts: 0, liked: false },
    { id: 4, who: 2, text: 'G!!', hearts: 1, liked: false },
  ]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState<number | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const nextId = useRef(5);
  const reply = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const send = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setMsgs((m) => [...m, { id: nextId.current++, who: 0, text: t.slice(0, 120), hearts: 0, liked: false }]);
    setText('');
    const [who, line] = REPLIES[reply.current++ % REPLIES.length];
    if (timer.current) clearTimeout(timer.current);
    setTyping(who);
    timer.current = setTimeout(() => {
      setTyping(null);
      setMsgs((m) => [...m, { id: nextId.current++, who, text: line, hearts: 0, liked: false }]);
    }, 1300);
  };

  const like = (id: number) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, liked: !x.liked, hearts: x.hearts + (x.liked ? -1 : 1) } : x)));

  return (
    <div className={p.chatBox}>
      <div ref={feed} className={p.feed} aria-live="polite">
        {msgs.map((m) =>
          m.who === 'sys' ? (
            <p key={m.id} className={p.sys}>
              <Icon name="route" size={13} /> {m.text}
            </p>
          ) : (
            <div key={m.id} className={`${p.msg} ${m.who === 0 ? p.me : ''}`}>
              {m.who !== 0 && <Av n={PEOPLE[m.who].n} tone={PEOPLE[m.who].tone} size={28} />}
              <div className={p.bubble}>
                <small>{PEOPLE[m.who].name}</small>
                {m.text}
                <button type="button" className={`${p.heart} ${m.liked ? p.heartOn : ''} ${m.hearts ? p.heartShow : ''}`} onClick={() => like(m.id)} aria-pressed={m.liked} aria-label={`React with a heart to: ${m.text}`}>
                  <Icon name="heart" size={12} /> {m.hearts > 0 && m.hearts}
                </button>
              </div>
            </div>
          )
        )}
        {typing !== null && (
          <div className={p.msg}>
            <Av n={PEOPLE[typing].n} tone={PEOPLE[typing].tone} size={28} />
            <div className={`${p.bubble} ${p.typing}`} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
      </div>
      <form className={p.addRow} onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Say something…" aria-label="Message" maxLength={120} />
        <button type="submit" className={p.round} aria-label="Send" disabled={!text.trim()}>
          <Icon name="send" size={18} />
        </button>
      </form>
    </div>
  );
}

/* ================================================================ */
/*  Location sharing                                                 */
/* ================================================================ */

const STATUS = ['Still at home', 'On the way', 'Almost there', 'Arrived'];
/** [left %, top %] of each person at each step of "gala day". */
const WALK: [number, number][][] = [
  [
    [10, 78],
    [12, 30],
    [46, 86],
    [78, 82],
  ],
  [
    [24, 66],
    [26, 40],
    [50, 74],
    [74, 56],
  ],
  [
    [48, 46],
    [44, 38],
    [58, 58],
    [76, 36],
  ],
  [
    [70, 30],
    [66, 28],
    [70, 38],
    [80, 26],
  ],
];
/** Which status each person shows at each step. */
const STATE_AT: number[][] = [
  [0, 0, 0, 0],
  [1, 1, 0, 1],
  [2, 2, 1, 2],
  [3, 3, 2, 3],
];

export function LocationPreview() {
  const [share, setShare] = useState(true);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setStep((s) => {
        if (s >= 3) {
          setRunning(false);
          return s;
        }
        return s + 1;
      });
    }, 1500);
    return () => clearInterval(t);
  }, [running]);

  const play = () => {
    setShare(true);
    setStep(0);
    setRunning(true);
  };

  return (
    <div className={p.split}>
      <div className={p.mapBox}>
        <svg viewBox="0 0 360 250" className={p.mapSvg} aria-hidden="true">
          <rect width="360" height="250" className={p.mapBg} />
          <path d="M0 200c40-22 80 8 120-8s90-40 140-24 70 24 100 14v68H0z" className={p.water} />
          <path d="M-5 90 120 120 240 70 365 100M70 -5 90 255M220 -5 240 255" className={p.road} />
        </svg>
        <span className={p.flag}>
          <Icon name="pin" size={16} /> Meeting point
        </span>
        {share ? (
          PEOPLE.map((x, i) => {
            const [l, t] = WALK[step][i];
            const moving = STATE_AT[step][i] === 1 || STATE_AT[step][i] === 2;
            return (
              <span key={x.name} className={`${p.mover} ${STATE_AT[step][i] === 0 ? p.dim : ''}`} style={{ left: `${l}%`, top: `${t}%` }}>
                {moving && <i className={p.movePulse} />}
                <Av n={x.n} tone={x.tone} size={32} />
              </span>
            );
          })
        ) : (
          <p className={p.noShare}>Nobody&apos;s sharing yet. Sharing is always opt-in.</p>
        )}
      </div>
      <div className={p.col}>
        <h4 className={p.h}>Who&apos;s OTW?</h4>
        <label className={p.switchRow}>
          <span>
            <b>Share my location</b>
            <small>Opt-in. Stop anytime.</small>
          </span>
          <input type="checkbox" role="switch" checked={share} onChange={(e) => setShare(e.target.checked)} />
          <i className={p.sw} aria-hidden="true" />
        </label>
        <ul className={p.who}>
          {PEOPLE.map((x, i) => (
            <li key={x.name}>
              <Av n={x.n} tone={x.tone} size={26} />
              <b>{x.name}</b>
              <span className={`${p.chipS} ${p[`s${share ? STATE_AT[step][i] : 0}`]}`}>{share ? STATUS[STATE_AT[step][i]] : 'Not sharing'}</span>
            </li>
          ))}
        </ul>
        <div className={p.rowBtns}>
          <button type="button" className={p.pill} onClick={play} disabled={running}>
            <Icon name="nav" size={15} /> Simulate gala day
          </button>
          <button type="button" className={`${p.pill} ${p.pillGhost}`} onClick={() => { setRunning(false); setStep(0); }}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Photos and memories                                              */
/* ================================================================ */

const PALETTES: [string, string, string, string][] = [
  ['#f8e140', '#e0417c', '#2f8aa3', '#fff8f2'],
  ['#eac7df', '#2f8aa3', '#1f6376', '#f8e140'],
  ['#e0417c', '#f8e140', '#c22e64', '#fff8f2'],
  ['#2f8aa3', '#eac7df', '#1f6376', '#f8e140'],
  ['#fff8f2', '#e0417c', '#2f8aa3', '#f8e140'],
  ['#f8e140', '#2f8aa3', '#c22e64', '#eac7df'],
];

function Scene({ seed }: { seed: number }) {
  const [sky, sun, hill, accent] = PALETTES[seed % PALETTES.length];
  const shift = (seed * 37) % 60;
  return (
    <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={p.scene}>
      <rect width="200" height="150" fill={sky} />
      <circle cx={50 + shift} cy={44} r={20} fill={sun} />
      <path d={`M-10 120 Q ${40 + shift / 2} 70 ${90} 110 T 210 100 V 160 H -10z`} fill={hill} />
      <path d={`M-10 140 Q 60 100 120 130 T 210 125 V 160 H -10z`} fill={accent} opacity="0.9" />
      <circle cx={150 - shift / 2} cy={30} r={3} fill={accent} />
      <circle cx={170 - shift / 3} cy={52} r={2} fill={accent} />
    </svg>
  );
}

interface Photo {
  id: number;
  seed: number;
  caption: string;
  hearts: number;
  liked: boolean;
}

export function PhotosPreview() {
  const [photos, setPhotos] = useState<Photo[]>([
    { id: 1, seed: 0, caption: 'Sunrise at the terminal', hearts: 3, liked: false },
    { id: 2, seed: 1, caption: 'Bulalo break', hearts: 5, liked: false },
    { id: 3, seed: 2, caption: 'Taal view deck', hearts: 4, liked: false },
    { id: 4, seed: 3, caption: 'The whole barkada', hearts: 7, liked: false },
    { id: 5, seed: 4, caption: 'Picnic mat chaos', hearts: 2, liked: false },
    { id: 6, seed: 5, caption: 'Golden hour drive', hearts: 6, liked: false },
  ]);
  const [open, setOpen] = useState<number | null>(null);
  const nextId = useRef(7);

  const toggle = (id: number) => setPhotos((x) => x.map((y) => (y.id === id ? { ...y, liked: !y.liked, hearts: y.hearts + (y.liked ? -1 : 1) } : y)));
  const current = photos.find((x) => x.id === open) ?? null;

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={p.photoBox}>
      <div className={p.photoHead}>
        <h4 className={p.h}>Gala Dump</h4>
        <button
          type="button"
          className={p.pill}
          onClick={() => {
            const id = nextId.current++;
            setPhotos((x) => [{ id, seed: id, caption: 'New memory', hearts: 0, liked: false }, ...x]);
          }}
        >
          <Icon name="camera" size={15} /> Add a memory
        </button>
      </div>
      <ul className={p.grid}>
        {photos.map((ph, i) => (
          <li key={ph.id} style={{ '--i': i } as CSSProperties} className={i % 5 === 0 ? p.tall : ''}>
            <button type="button" className={p.photo} onClick={() => setOpen(ph.id)} aria-label={`Open photo: ${ph.caption}`}>
              <Scene seed={ph.seed} />
              <span className={p.photoCap}>{ph.caption}</span>
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div className={p.lightbox} role="dialog" aria-modal="true" aria-label={current.caption} onClick={() => setOpen(null)}>
          <div className={p.lbCard} onClick={(e) => e.stopPropagation()}>
            <div className={p.lbPic}>
              <Scene seed={current.seed} />
            </div>
            <div className={p.lbBar}>
              <b>{current.caption}</b>
              <button type="button" className={`${p.pill} ${current.liked ? p.pillOn : ''}`} onClick={() => toggle(current.id)} aria-pressed={current.liked}>
                <Icon name="heart" size={15} /> {current.hearts}
              </button>
              <button type="button" className={p.round} onClick={() => setOpen(null)} aria-label="Close photo">
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

