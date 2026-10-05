'use client';

import { Avatar, Button, StatusBadge } from '@/components/otw';
import { ST, type AttendanceKey } from '@/lib/otw/data';
import { useGala } from '@/lib/otw/gala-store';
import { toast } from '@/lib/otw/feedback';
import { nudgeMember } from '@/lib/api/gala';
import s from './attendance.module.css';

/** One card per status with its members. The leader can nudge the Maybes. */
export function MemberGroups() {
  const { members, memberRows, me, role, roomId } = useGala();
  // The server only nudges members who answered Maybe (not the ones who haven't answered yet).
  const saidMaybe = new Set(memberRows.filter((r) => r.rsvpStatus === 'MAYBE').map((r) => r.userId));

  const nudge = (userId: string, name: string) => {
    if (!roomId) return;
    nudgeMember(roomId, userId)
      .then(() => toast(`Nudged ${name}.`))
      .catch((e: unknown) => toast(e instanceof Error && e.message ? e.message : `Couldn't nudge ${name}.`, 'err'));
  };

  return (
    <div className={`g g3 ${s.grp}`}>
      {(['g', 'm', 'x'] as AttendanceKey[]).map((k) => {
        const group = members.filter((m) => m.s === k);
        return (
          <section key={k} className="card" aria-label={ST[k].b}>
            <div className="rh">
              <h3>{ST[k].b}</h3>
              <StatusBadge status={k} />
            </div>
            <ul className="mlist">
              {group.length ? (
                group.map((m) => (
                  <li key={m.id ?? m.n}>
                    <Avatar name={m.n} tone={m.c} size={34} online={!!m.on} />
                    <span>
                      {m.n}
                      {m.n === me ? ' (you)' : ''}
                    </span>
                    {k === 'm' && role === 'leader' && m.n !== me && m.id && saidMaybe.has(m.id) && (
                      <Button variant="ghost" sm onClick={() => nudge(m.id!, m.n)} aria-label={`Nudge ${m.n}`}>
                        Nudge
                      </Button>
                    )}
                  </li>
                ))
              ) : (
                <li className="fine">Nobody here yet.</li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
