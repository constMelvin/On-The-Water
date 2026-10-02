'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { Avatar, Button, Icon, StatusBadge, Tag, blob } from '@/components/otw';
import type { IconName } from '@/lib/otw/icons';
import { ST, counts, peso, type AttendanceKey } from '@/lib/otw/data';
import { countdownTo, galaStart } from '@/lib/otw/gala-registry';
import { useGala } from '@/lib/otw/gala-store';
import { burstEl, toast } from '@/lib/otw/feedback';
import { postSystemLine } from '@/lib/otw/mock/chat';
import { galaHref } from './nav';
import { useCopyCode } from './useCopyCode';
import { Empty, ErrorState, Offline, Skeleton } from './States';

type Tone = 'blossom' | 'zest' | 'cream' | 'teal' | 'rosy';

/* ---------------- hero parts ---------------- */

/** Ticks by minute to the gala start. The demo gala uses the fixed demo clock. */
function Countdown() {
  const { gala } = useGala();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const left = gala.dateISO ? countdownTo(galaStart(gala.dateISO, gala.startTime), new Date(now)) : { d: 0, h: 0, m: 0 };
  return (
    <div
      className="cdown"
      role="group"
      aria-label={`Countdown: ${left.d} days, ${left.h} hours, ${left.m} minutes`}
    >
      <div>
        <b>{left.d}</b>
        <span>days</span>
      </div>
      <div>
        <b>{left.h}</b>
        <span>hours</span>
      </div>
      <div>
        <b>{left.m}</b>
        <span>mins</span>
      </div>
    </div>
  );
}

/** "Your status" 3-way control (reference seg3). */
function StatusSeg() {
  const { gala, me, myStatus, setMyStatus } = useGala();
  const pick = (k: AttendanceKey, e: MouseEvent<HTMLButtonElement>) => {
    postSystemLine(gala.code, `${me} changed their status to ${ST[k].l}.`);
    // TODO(backend): push the RSVP change to other members over realtime instead of waiting for the 15 s poll.
    setMyStatus(k);
    if (k === 'g') {
      toast("You're marked as G. The chat knows.");
      burstEl(e.currentTarget);
    } else {
      toast(`Status updated: ${ST[k].l}.`);
    }
  };
  return (
    <div className="seg sm3" role="group" aria-label="Your status">
      {(['g', 'm', 'x'] as AttendanceKey[]).map((k) => (
        <button key={k} type="button" aria-pressed={myStatus === k} onClick={(e) => pick(k, e)}>
          {ST[k].l}
        </button>
      ))}
    </div>
  );
}

function Hero() {
  const { phase, gala, members, summary } = useGala();
  const href = (s: string) => galaHref(gala.code, s);
  // Live travel counts from GET /summary; a tag with nobody in it is hidden.
  const travel = summary?.travel;

  if (phase === 'done') {
    return (
      <section className="dhero bg-rosy">
        <div>
          <h1 className="h1s">You made it happen.</h1>
          <p className="lead2">From “G tayo?” to an actual day on the calendar.</p>
          <Link className="btn zest" href={href('recap')}>
            See the recap
          </Link>
        </div>
      </section>
    );
  }

  if (phase === 'day') {
    return (
      <section className="dhero bg-rosy">
        <div>
          <h1 className="h1s">Today&apos;s the day.</h1>
          <p className="lead2">{[gala.title, gala.dest].filter(Boolean).join(' · ')}</p>
          <div className="pmeta">
            {!!travel?.arrived && (
              <Tag variant="cream" icon="check">
                {travel.arrived} already there
              </Tag>
            )}
            {!!travel?.almostThere && (
              <Tag variant="zest" icon="nav">
                {travel.almostThere} almost there
              </Tag>
            )}
            {!!travel?.onTheWay && (
              <Tag variant="cream" icon="clock">
                {travel.onTheWay} on the way
              </Tag>
            )}
          </div>
        </div>
        <div className="dright">
          <Link className="btn zest" href={href('map')}>
            <Icon name="map" size={20} /> Open the map
          </Link>
          <StatusSeg />
        </div>
      </section>
    );
  }

  return (
    <section className="dhero bg-rosy">
      <div>
        <h1 className="h1s">Let&apos;s get this gala together.</h1>
        <h2 className="gt">{gala.title}</h2>
        <div className="pmeta">
          {gala.range && (
            <Tag variant="cream" icon="calendar">
              {gala.range}
            </Tag>
          )}
          {gala.dest && (
            <Tag variant="cream" icon="pin">
              {gala.dest}
            </Tag>
          )}
          <Tag variant="cream" icon="users">
            {members.length} {members.length === 1 ? 'person' : 'people'}
          </Tag>
        </div>
      </div>
      <div className="dright">
        <Countdown />
        <div className="mystat">
          <span>Your status</span>
          <StatusSeg />
        </div>
      </div>
    </section>
  );
}

/* ---------------- route ---------------- */

// The "Want to keep your gala with you?" account banner is gone: an account is now required
// to plan or join, so everyone in a gala already has one.

const ROUTE: [label: string, icon: IconName, seg: string][] = [
  ['G tayo?', 'sparkle', ''],
  ['When', 'calendar', 'settings'],
  ["Who's G?", 'users', 'attendance'],
  ['Plan', 'route', 'route'],
  ['How much', 'calc', 'budget'],
  ['What we need', 'checklist', 'checklist'],
  ['Where is everyone', 'pin', 'map'],
  ['OTW na.', 'nav', 'map'],
];

function RouteStrip() {
  const { phase, gala } = useGala();
  const done = phase === 'planning' ? 5 : phase === 'day' ? 6 : 8;
  return (
    <div className="routewrap">
      <ol className="route" aria-label="Gala journey">
        {ROUTE.map(([label, icon, seg], i) => (
          <li key={label} className={`rs ${i < done ? 'done' : i === done ? 'cur' : 'lock'}`}>
            <Link href={galaHref(gala.code, seg)} aria-current={i === done ? 'step' : undefined}>
              <span className="dot">
                <Icon name={i < done ? 'check' : icon} size={18} />
              </span>
              <span className="rl">{label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------- feature grid + rail ---------------- */

function FeatureGrid() {
  const { gala, members, phase, unread, summary } = useGala();
  const c = counts(members);
  // Everything below comes from GET /summary; "—" shows until it loads.
  const stopCount = summary ? summary.itineraryStops : '—';
  // TODO(backend): "What are we bringing?" reads checklist counts from /summary; will reconcile when the checklist CRUD is wired.
  const packed = summary ? summary.checklistDone : '—';
  const itemCount = summary ? summary.checklistTotal : '—';
  // TODO(backend): dashboard reads budget from /summary; will reconcile when the budget PUT is wired.
  // Until then the Gastos tab's mock slice edits don't move this card.
  const perPerson = summary ? peso(summary.budgetPerPerson) : '—';
  // TODO(backend): "Who paid?" reads totalSpent from /summary; will reconcile when the expenses endpoints are wired.
  const spentSoFar = summary ? peso(summary.totalSpent) : '—';
  const photos = summary?.photoCount ?? 0;

  const F: [seg: string, title: string, sub: string, icon: IconName, tone: Tone, tag: string][] = [
    ['attendance', "Who's G?", `${c.g} going · ${c.m} maybe`, 'users', 'blossom', 'Attendance'],
    ['route', "What's the plan?", `${stopCount} stops on the route`, 'route', 'zest', 'Itinerary'],
    ['budget', 'How much?', `${perPerson} per person`, 'calc', 'cream', 'Budget'],
    ['ambagan', 'Who paid?', `${spentSoFar} spent so far`, 'wallet', 'teal', 'Ambagan'],
    ['checklist', 'What are we bringing?', `${packed} of ${itemCount} packed`, 'checklist', 'blossom', 'Checklist'],
    ['map', 'Where is everyone?', phase === 'planning' ? 'Opens on gala day' : "Tap to see who's OTW", 'nav', 'rosy', 'Live location'],
    ['chat', "What's the chismis?", `${unread} new messages`, 'chat', 'zest', 'Chat'],
    ['dump', 'What did we get?', photos ? `${photos} photos so far` : 'No memories yet', 'image', 'cream', 'Gala Dump'],
    ['couple', 'Just the two of you?', 'Same OTW energy.', 'heart', 'blossom', 'Couple Mode'],
  ];

  return (
    <div className="fgrid">
      {F.map(([seg, title, sub, icon, tone, tag], i) => (
        <Link key={seg} href={galaHref(gala.code, seg)} className={`fcard c-${tone} lift`}>
          <span className="ico" style={blob(i)}>
            <Icon name={icon} size={26} />
          </span>
          <h3>{title}</h3>
          <p>{sub}</p>
          <Tag variant={tone === 'zest' ? 'cream' : 'zest'}>{tag}</Tag>
        </Link>
      ))}
    </div>
  );
}

function Rail() {
  const { gala, members, me, role, openSheet } = useGala();
  const copyCode = useCopyCode();
  const c = counts(members);
  const href = (s: string) => galaHref(gala.code, s);

  return (
    <aside className="rail">
      <div className="card">
        <div className="rh">
          <h3>Who&apos;s in</h3>
          <Tag variant="st-g" icon="check">
            {c.g} going
          </Tag>
        </div>
        <ul className="mlist">
          {members.slice(0, 6).map((m) => (
            <li key={m.n}>
              <Avatar name={m.n} tone={m.c} size={34} online={!!m.on} />
              <span>
                {m.n}
                {m.n === me ? ' (you)' : ''}
                {m.role === 'leader' && (
                  <>
                    {' '}
                    <Icon name="crown" size={16} />
                    <span
                      style={{
                        position: 'absolute',
                        width: 1,
                        height: 1,
                        overflow: 'hidden',
                        clip: 'rect(0 0 0 0)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Gala Leader
                    </span>
                  </>
                )}
              </span>
              <StatusBadge status={m.s} />
            </li>
          ))}
        </ul>
        {members.length <= 1 && (
          // Only the planner so far: the empty copy lives here, the rest of the dashboard stays.
          <div className="empty" style={{ padding: '10px 0', margin: 0, maxWidth: 'none' }}>
            <h3>Just you so far.</h3>
            <p className="fine">Share the gala code and get your friends in.</p>
            <Button sm onClick={() => openSheet('share')}>
              Share Gala
            </Button>
          </div>
        )}
        <Link className="lnk" href={href('attendance')}>
          See everyone
        </Link>
      </div>

      <div className="card c-zest">
        <h3>Gala Code</h3>
        <button type="button" className="codebig" onClick={copyCode} aria-label={`Copy gala code ${gala.code}`}>
          {gala.code}
          <Icon name="copy" size={20} />
        </button>
        <p className="fine">Friends join with this code.</p>
      </div>

      {role === 'leader' && (
        <div className="card">
          <h3>Gala Leader</h3>
          <p className="fine">Edit details, manage members and access.</p>
          <Link className="btn sm teal" href={href('settings')}>
            <Icon name="sliders" size={18} /> Manage gala
          </Link>
        </div>
      )}
    </aside>
  );
}

/* ---------------- page ---------------- */

export function Dashboard() {
  const { viewState, liveState, phase, openSheet, setViewState, retry } = useGala();
  // The dev switcher (any non-default viewState) wins; otherwise the real query state decides.
  const state = viewState !== 'default' ? viewState : liveState;

  if (state === 'loading') return <Skeleton label="Loading the dashboard" />;
  if (state === 'error') {
    const tryAgain = () => {
      setViewState('default'); // clears the dev-switcher override; a real failure keeps showing this state
      return retry();
    };
    return <ErrorState kind="dashboard" onRetry={tryAgain} />;
  }
  // Only the dev switcher's "Empty" shows the full-page empty state; a lone planner sees the whole dashboard.
  if (state === 'empty') return <Empty kind="dashboard" onAction={() => openSheet('share')} />;

  return (
    <>
      {state === 'offline' && <Offline />}
      <Hero />
      {phase !== 'done' && <RouteStrip />}
      <div className="dgrid">
        <FeatureGrid />
        <Rail />
      </div>
    </>
  );
}
