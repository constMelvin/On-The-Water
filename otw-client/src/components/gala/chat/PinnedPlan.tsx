'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/otw';
import { peso } from '@/lib/otw/data';
import { useGala } from '@/lib/otw/gala-store';
import { galaHref } from '../nav';
import s from './chat.module.css';

/* Hidden / shown is remembered on this device only (a per-viewer convenience, never synced). */
const HIDE_KEY = 'otw:chat-pinned-hidden';
const listeners = new Set<() => void>();

/** In memory first, so the toggle still works when storage is blocked. */
let memo: boolean | null = null;

function readHidden(): boolean {
  if (memo === null) {
    try {
      memo = window.localStorage.getItem(HIDE_KEY) === '1';
    } catch {
      memo = false;
    }
  }
  return memo;
}

function setHidden(hidden: boolean) {
  memo = hidden;
  try {
    window.localStorage.setItem(HIDE_KEY, hidden ? '1' : '0');
  } catch {
    /* storage blocked: kept in memory until the page reloads */
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Zest "Locked in" bar at the top of the chat (reference .pinned). Collapses to one line so it doesn't cover the chat. */
export function PinnedPlan({ stops, perPerson }: { stops: number; perPerson: number }) {
  const { gala } = useGala();
  const hidden = useSyncExternalStore(subscribe, readHidden, () => false);
  const where = [gala.dest, `${stops} ${stops === 1 ? 'stop' : 'stops'}`, `${peso(perPerson)} each`].filter(Boolean);
  return (
    <div className={`${s.pinned}${hidden ? ` ${s.pinnedMin}` : ''}`}>
      {!hidden && (
        <span className="ico sm">
          <Icon name="flag" size={18} />
        </span>
      )}
      <div>
        <b>Locked in: {gala.range || 'date TBD'}</b>
        {!hidden && <span>{where.join(' · ')}</span>}
      </div>
      {!hidden && (
        <Link className="lnk" href={galaHref(gala.code, 'route')}>
          View plan
        </Link>
      )}
      <button
        type="button"
        className={`ibtn ${s.pinToggle}`}
        onClick={() => setHidden(!hidden)}
        aria-expanded={!hidden}
        aria-label={hidden ? 'Show plan details' : 'Hide plan details'}
        title={hidden ? 'Show' : 'Hide'}
      >
        <Icon name={hidden ? 'chevd' : 'chevu'} size={20} />
      </button>
    </div>
  );
}
