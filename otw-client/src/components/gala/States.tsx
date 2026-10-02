'use client';

/**
 * Screen states every gala tab shares: loading skeleton, empty, error, offline bar.
 * Copy is the reference EMPTY / ERR tables (references/otw/src/proto1.js); markup matches
 * its skeleton() / empty() / errBlock() / offline() and dashboard-state-*.png.
 *
 * Props only, no gala context, so any tab (or a dev page) can render them on their own.
 * Typical tab:
 *   <StateGate state={state} kind="checklist" onAction={() => openAdd()} onRetry={refetch}>
 *     ...the real screen...
 *   </StateGate>
 */
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button, Icon, blob } from '@/components/otw';
import type { IconName } from '@/lib/otw/icons';
import { toast } from '@/lib/otw/feedback';

/* ---------------- copy (reference EMPTY / ERR) ---------------- */

interface EmptyCopy {
  i: IconName;
  t: string;
  b: string;
  /** Button label. */
  c: string;
  /** Where the button goes when the caller passes neither onAction nor href. */
  href?: string;
}

export const EMPTY = {
  dashboard: { i: 'users', t: 'Just you so far.', b: 'Share the gala code and get your friends in.', c: 'Share Gala' },
  attendance: { i: 'users', t: 'No responses yet.', b: 'Ask the GC. Tap Share Gala to send the code again.', c: 'Share Gala' },
  itinerary: { i: 'pin', t: 'No stops yet. Saan tayo?', b: 'Add the places, activities, food stops, and everything in between.', c: 'Add a Stop' },
  checklist: { i: 'checklist', t: 'Nothing here yet. Pack smart.', b: 'Add the things someone always forgets, like the charger.', c: 'Add to Checklist' },
  budget: { i: 'calc', t: 'No estimates yet.', b: 'Start with transportation. Everything else follows.', c: 'Add an estimate' },
  expenses: { i: 'wallet', t: 'No expenses yet. Walang nag-abono. Pa.', b: 'When someone pays for something, log it here so nobody has to remember.', c: 'Add an expense' },
  chat: { i: 'chat', t: 'Quiet in here. Say something.', b: 'Start with a “G!” or ask who is bringing the speaker.', c: 'Say hi' },
  location: { i: 'nav', t: "Nobody's sharing yet.", b: 'When people start heading out, they can share live location here. Sharing is always opt-in.', c: 'Share my location' },
  dump: { i: 'image', t: 'No memories yet. Go make some.', b: 'Photos from the gala land here for everyone.', c: 'Add Photos' },
  couple: { i: 'heart', t: 'No ideas saved yet.', b: 'Pick a few date ideas to start your plan for two.', c: 'Browse ideas' },
  mygalas: { i: 'calendar', t: 'Nothing on the calendar yet.', b: 'Sounds like a good time to plan something.', c: 'Plan a Gala', href: '/plan' },
  history: { i: 'notepad', t: "No past galas yet. Let's fix that.", b: 'Finished galas show up here with their photos and expenses.', c: 'Plan a Gala', href: '/plan' },
  notifs: { i: 'bell', t: 'All caught up.', b: 'When there is something to know, it shows up here first.', c: 'Back to My Galas', href: '/me/galas' },
} satisfies Record<string, EmptyCopy>;

export const ERR = {
  dashboard: { t: "The dashboard didn't load.", b: 'Your gala is safe. Give it another try.' },
  attendance: { t: "Couldn't save your status.", b: 'Nothing changed. Tap your choice again.' },
  itinerary: { t: "The route didn't load.", b: 'Your stops are safe. Try again.' },
  checklist: { t: "Couldn't update the checklist.", b: 'Nothing was lost. Try again in a moment.' },
  budget: { t: "Couldn't save your estimate.", b: 'Your numbers are still on this screen. Try saving again.' },
  expenses: { t: "Couldn't load the expenses.", b: 'Nothing was changed. Try again.' },
  chat: { t: "Messages didn't load.", b: 'Your chat is still there. Try again.' },
  couple: { t: "Couldn't load your ideas.", b: 'Try again in a moment.' },
  settings: { t: "Couldn't save your changes.", b: 'Nothing changed. Try again.' },
  completed: { t: "The recap didn't load.", b: 'Everything is still saved. Try again.' },
  mygalas: { t: "Couldn't load your galas.", b: 'They are still saved to your account. Try again.' },
  history: { t: "History didn't load.", b: 'Try again in a moment.' },
  notifs: { t: 'Notifications are blocked in your browser.', b: 'Allow notifications for this site in your browser settings, then come back and try again.' },
  profile: { t: "Couldn't save your profile.", b: 'Nothing changed. Try again.' },
} satisfies Record<string, { t: string; b: string }>;

export type EmptyKey = keyof typeof EMPTY;
export type ErrKey = keyof typeof ERR;
/** Same values as gala-store's ViewState. */
export type ScreenState = 'default' | 'loading' | 'empty' | 'error' | 'offline';

/* ---------------- Skeleton ---------------- */

export interface SkeletonProps {
  /** grid = hero + 6 cards (most tabs); chat = message bubbles; dump = photo masonry. */
  variant?: 'grid' | 'chat' | 'dump';
  /** Screen-reader label, e.g. "Loading the checklist". */
  label?: string;
}

export function Skeleton({ variant = 'grid', label = 'Loading' }: SkeletonProps) {
  return (
    <div className="skl" role="status" aria-busy="true" aria-label={label}>
      {variant === 'dump' ? (
        <>
          <div className="sk" style={{ height: 56, width: '60%' }} aria-hidden="true" />
          <div className="sk-masonry" aria-hidden="true">
            {[190, 250, 170, 280, 210, 240, 180, 260].map((h, i) => (
              <div key={i} className="sk" style={{ height: h }} />
            ))}
          </div>
        </>
      ) : variant === 'chat' ? (
        [70, 90, 60, 80, 64].map((h, i) => (
          <div key={i} className={`sk-row${i % 2 ? ' me' : ''}`} aria-hidden="true">
            <div className="sk" style={{ height: h, width: '56%' }} />
          </div>
        ))
      ) : (
        <>
          <div className="sk" style={{ height: 132 }} aria-hidden="true" />
          <div className="g g3" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="sk" style={{ height: 110 }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Empty ---------------- */

export interface EmptyProps {
  /** Which copy from the EMPTY table. */
  kind: EmptyKey;
  /** The button's action (open the add sheet, share sheet...). */
  onAction?: () => void;
  /** Or make the button a link. Defaults to the table's link for mygalas / history / notifs. */
  href?: string;
  /** Override the table copy (rarely needed). */
  title?: string;
  body?: string;
  cta?: string;
}

export function Empty({ kind, onAction, href, title, body, cta }: EmptyProps) {
  const e: EmptyCopy = EMPTY[kind];
  const label = cta ?? e.c;
  const to = href ?? (onAction ? undefined : e.href);
  return (
    <div className="empty">
      <div className="ico xl" style={blob(2)}>
        <Icon name={e.i} size={44} />
      </div>
      <h3>{title ?? e.t}</h3>
      <p>{body ?? e.b}</p>
      {to ? (
        <Link className="btn rosy" href={to}>
          {label}
        </Link>
      ) : (
        // No action wired yet: same as the reference's "noop" button.
        <Button onClick={onAction ?? (() => toast('This opens the form.'))}>{label}</Button>
      )}
    </div>
  );
}

/* ---------------- ErrorState ---------------- */

export interface ErrorStateProps {
  /** Which copy from the ERR table. */
  kind: ErrKey;
  /**
   * "Try again". Return (or resolve) true/false to get the reference toasts
   * ("Back in business." / "Still can't reach the server..."); return nothing for no toast.
   */
  onRetry?: () => boolean | void | Promise<boolean | void>;
  title?: string;
  body?: string;
}

export function ErrorState({ kind, onRetry, title, body }: ErrorStateProps) {
  const e = ERR[kind];
  const [busy, setBusy] = useState(false);
  const tryAgain = async () => {
    if (!onRetry) return;
    setBusy(true);
    try {
      const ok = await onRetry();
      if (ok === true) toast('Back in business.');
      else if (ok === false) toast("Still can't reach the server. Try again in a moment.", 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="empty err" role="alert">
      <div className="ico xl" style={{ ...blob(3), color: 'var(--rosy-dark)' }}>
        <Icon name="alert" size={44} />
      </div>
      <h3>{title ?? e.t}</h3>
      <p>{body ?? e.b}</p>
      <Button onClick={tryAgain} disabled={busy} aria-busy={busy}>
        <Icon name="refresh" size={20} /> Try again
      </Button>
    </div>
  );
}

/* ---------------- Offline ---------------- */

/** The "Connection's a bit shaky." bar. Render it above the (stale) screen, not instead of it. */
export function Offline() {
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

/* ---------------- StateGate (reference gate()) ---------------- */

export interface StateGateProps {
  state: ScreenState;
  /** Picks the EMPTY / ERR copy. A kind missing from a table falls through to the screen. */
  kind: EmptyKey | ErrKey;
  skeleton?: SkeletonProps['variant'];
  onAction?: () => void;
  onRetry?: ErrorStateProps['onRetry'];
  children: ReactNode;
}

/** loading -> Skeleton, empty -> Empty, error -> ErrorState, offline -> Offline bar + the screen. */
export function StateGate({ state, kind, skeleton, onAction, onRetry, children }: StateGateProps) {
  if (state === 'loading') return <Skeleton variant={skeleton} />;
  if (state === 'empty' && kind in EMPTY) return <Empty kind={kind as EmptyKey} onAction={onAction} />;
  if (state === 'error' && kind in ERR) return <ErrorState kind={kind as ErrKey} onRetry={onRetry} />;
  return (
    <>
      {state === 'offline' && <Offline />}
      {children}
    </>
  );
}
