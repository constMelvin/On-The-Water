'use client';

import type { MouseEvent } from 'react';
import { Icon } from '@/components/otw';
import { ST, type AttendanceKey } from '@/lib/otw/data';
import { useGala } from '@/lib/otw/gala-store';
import { burstEl, toast } from '@/lib/otw/feedback';
import s from './attendance.module.css';

const TONE: Record<AttendanceKey, string> = { g: 'c-teal', m: 'c-zest', x: 'c-blossom' };

/** Big 3-way "Your status" choice (reference views.attendance .choice). The current one is outlined. */
export function StatusChoice() {
  const { myStatus, setMyStatus } = useGala();

  const pick = (k: AttendanceKey, e: MouseEvent<HTMLButtonElement>) => {
    // Same call as the dashboard: instant locally, then PATCH /rooms/{roomId}/members/me/rsvp.
    // The server writes the chat's system line and broadcasts member.rsvp.changed to everyone.
    setMyStatus(k);
    if (k === 'g') {
      toast("You're marked as G. The chat knows.");
      burstEl(e.currentTarget);
    } else {
      toast(`Status updated: ${ST[k].l}.`);
    }
  };

  return (
    <div className={s.choice} role="group" aria-label="Your status">
      {(['g', 'm', 'x'] as AttendanceKey[]).map((k) => (
        <button
          key={k}
          type="button"
          className={`${s.ch} ${TONE[k]}`}
          aria-pressed={myStatus === k}
          onClick={(e) => pick(k, e)}
        >
          <Icon name={ST[k].i} size={26} />
          <b>{ST[k].l}</b>
        </button>
      ))}
    </div>
  );
}



