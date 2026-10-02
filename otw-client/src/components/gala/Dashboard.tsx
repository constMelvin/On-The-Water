'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { Avatar, Button, Icon, StatusBadge, Tag, blob } from '@/components/otw';
import type { IconName } from '@/lib/otw/icons';
import { ST, counts, peso, type AttendanceKey } from '@/lib/otw/data';
import { countdownTo, galaStart } from '@/lib/otw/gala-registry';
import { useGala } from '@/lib/otw/gala-store';
import { burstEl, toast } from '@/lib/otw/feedback';
import { galaHref } from './nav';
import { useCopyCode } from './useCopyCode';

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
  const { myStatus, setMyStatus } = useGala();
  const pick = (k: AttendanceKey, e: MouseEvent<HTMLButtonElement>) => {
    // TODO(backend): the reference also posts a chat system line, "<me> changed their status to <label>."
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

/* ---------------- banner + route ---------------- */

function AccountBanner() {
  const { hasAccount, bannerOpen, dismissBanner, openSheet } = useGala();
  if (hasAccount || !bannerOpen) return null;
  return (
    <div className="banner">
      <span className="ico sm">
        <Icon name="sparkle" size={18} />
      </span>
      <div>
        <b>Want to keep your gala with you?</b>
        <span>Save your galas, calendar, history and reminders. This gala works fine without an account.</span>
      </div>
      <Button sm onClick={() => openSheet('account')}>
        Create an Account
      </Button>
      <button type="button" className="ibtn" onClick={dismissBanner} aria-label="Dismiss">
        <Icon name="x" size={20} />
      </button>
    </div>
  );
}

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
  const packed = summary ? summary.checklistDone : '—';
  const itemCount = summary ? summary.checklistTotal : '—';
  const perPerson = summary ? peso(summary.budgetPerPerson) : '—';
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

/* ---------------- states ---------------- */

function Skeleton() {
  return (
    <div className="skl" role="status" aria-busy="true" aria-label="Loading the dashboard">
      <div className="sk" style={{ height: 132 }} aria-hidden="true" />
      <div className="g g3" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="sk" style={{ height: 110 }} />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  const { openSheet } = useGala();
  return (
    <div className="empty">
      <div className="ico xl" style={blob(2)}>
        <Icon name="users" size={44} />
      </div>
      <h3>Just you so far.</h3>
      <p>Share the gala code and get your friends in.</p>
      <Button onClick={() => openSheet('share')}>Share Gala</Button>
    </div>
  );
}

function ErrorState() {
  const { setViewState, retry } = useGala();
  const [busy, setBusy] = useState(false);
  const tryAgain = async () => {
    setBusy(true);
    setViewState('default'); // clears the dev-switcher override; a real failure keeps showing this state
    const ok = await retry();
    setBusy(false);
    toast(ok ? 'Back in business.' : "Still can't reach the server. Try again in a moment.", ok ? '' : 'err');
  };
  return (
    <div className="empty err" role="alert">
      <div className="ico xl" style={{ ...blob(3), color: 'var(--rosy-dark)' }}>
        <Icon name="alert" size={44} />
      </div>
      <h3>The dashboard didn&apos;t load.</h3>
      <p>Your gala is safe. Give it another try.</p>
      <Button onClick={tryAgain} disabled={busy} aria-busy={busy}>
        <Icon name="refresh" size={20} /> Try again
      </Button>
    </div>
  );
}

function OfflineBar() {
  return (
    <div className="offl" role="status">
      <Icon name="wifioff" size={22} />
      <div>
        <b>Connection&apos;s a bit shaky.</b> You&apos;re seeing the last saved version. Anything you change will sync
        when you&apos;re back online.
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

export function Dashboard() {
  const { viewState, liveState, members, phase } = useGala();
  // The dev switcher (any non-default viewState) wins; otherwise the real query state decides.
  const state = viewState !== 'default' ? viewState : liveState;

  if (state === 'loading') return <Skeleton />;
  if (state === 'error') return <ErrorState />;
  // Only the dev switcher's "Empty" shows the full-page empty state; a lone planner sees the whole dashboard.
  if (state === 'empty') return <EmptyState />;

  return (
    <>
      {state === 'offline' && <OfflineBar />}
      <Hero />
      <AccountBanner />
      {phase !== 'done' && <RouteStrip />}
      <div className="dgrid">
        <FeatureGrid />
        <Rail />
      </div>
    </>
  );
}
