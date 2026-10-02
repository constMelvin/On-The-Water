'use client';

import { Avatar, Button, StatusBadge } from '@/components/otw';
import { ST, type AttendanceKey } from '@/lib/otw/data';
import { useGala } from '@/lib/otw/gala-store';
import { toast } from '@/lib/otw/feedback';
import s from './attendance.module.css';

/** One card per status with its members. The leader can nudge the Maybes. */
export function MemberGroups() {
  const { members, me, role } = useGala();

  const nudge = (name: string) => {
    // TODO(backend): nudge notification endpoint (POST /rooms/{roomId}/members/{userId}/nudge, host only).
    toast(`Nudged ${name}.`);
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
                  <li key={m.n}>
                    <Avatar name={m.n} tone={m.c} size={34} online={!!m.on} />
                    <span>
                      {m.n}
                      {m.n === me ? ' (you)' : ''}
                    </span>
                    {k === 'm' && role === 'leader' && m.n !== me && (
                      <Button variant="ghost" sm onClick={() => nudge(m.n)} aria-label={`Nudge ${m.n}`}>
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
