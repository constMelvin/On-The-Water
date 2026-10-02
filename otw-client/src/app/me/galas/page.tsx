'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button, Icon, PageHead, blob } from '@/components/otw';
import { GalaCard, type CardGroup } from '@/components/me/GalaCard';
import { MeShell } from '@/components/me/MeShell';
import styles from '@/components/me/me.module.css';
import { useMyRooms } from '@/lib/api/me-queries';
import type { MyRoomDto } from '@/lib/api/me';
import { rememberRoom, roomIdFor } from '@/lib/otw/gala-registry';

/**
 * My Galas: every gala on the account (any device), from GET /me/rooms.
 * The three views are disjoint and ordered by the backend, so each renders under its own heading.
 * The device registry (otw:rooms) is only a cache: it's refreshed here so /gala/[code] resolves.
 */

const GROUPS: { view: 'ongoing' | 'upcoming' | 'completed'; group: CardGroup; title: string }[] = [
  { view: 'ongoing', group: 'ongoing', title: 'Ongoing now' },
  { view: 'upcoming', group: 'upcoming', title: 'Coming up' },
  { view: 'completed', group: 'done', title: 'Completed' },
];

function useRememberRooms(rooms: MyRoomDto[]) {
  useEffect(() => {
    for (const r of rooms) {
      if (roomIdFor(r.roomCode) !== r.roomId) rememberRoom(r.roomCode, r.roomId);
    }
  }, [rooms]);
}

export default function MyGalasPage() {
  const ongoing = useMyRooms('ongoing');
  const upcoming = useMyRooms('upcoming');
  const completed = useMyRooms('completed');
  const results = { ongoing, upcoming, completed };

  const all = useMemo(
    () => [...(ongoing.data ?? []), ...(upcoming.data ?? []), ...(completed.data ?? [])],
    [ongoing.data, upcoming.data, completed.data],
  );
  useRememberRooms(all);

  const queries = [ongoing, upcoming, completed];
  const loading = queries.some((q) => q.isPending);
  const failed = queries.filter((q) => q.isError);
  const empty = !loading && failed.length === 0 && all.length === 0;

  return (
    <MeShell active="galas">
      <div className={styles.headRow}>
        <PageHead
          title="Your Gala Calendar"
          sub="Keep track of what's coming up, what's being planned, and what's already happened."
        />
        <Link className="btn sm rosy" href="/plan">
          <Icon name="plus" size={18} /> Plan a Gala
        </Link>
      </div>

      {failed.length > 0 && (
        <article className={`card ${styles.gcard}`} role="alert" style={{ marginTop: 26 }}>
          <span className={styles.gdate} aria-hidden="true">
            <Icon name="alert" size={24} />
          </span>
          <div className={styles.gcb}>
            <h3>Hindi ma-load ang mga gala mo.</h3>
            <p>Check your connection, then try again.</p>
          </div>
          <Button sm variant="teal" onClick={() => failed.forEach((q) => q.refetch())}>
            <Icon name="refresh" size={16} /> Try again
          </Button>
        </article>
      )}

      {loading && (
        <div className={styles.gl} role="status" aria-busy="true" aria-label="Loading your galas" style={{ marginTop: 26 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`sk ${styles.skel}`} aria-hidden="true" />
          ))}
        </div>
      )}

      {empty && (
        <div className={styles.gate}>
          <span className="ico xl" style={blob(2)}>
            <Icon name="calendar" size={44} />
          </span>
          <h3 className="h2">Wala pang ganap.</h3>
          <p className="sub">Sounds like a good time to plan something.</p>
          <Link className="btn rosy" href="/plan">
            <Icon name="plus" size={20} /> Plan a Gala
          </Link>
        </div>
      )}

      {GROUPS.map(({ view, group, title }) => {
        const list = results[view].data ?? [];
        if (!list.length) return null;
        return (
          <section key={view} aria-label={title}>
            <h3 className={styles.gh}>{title}</h3>
            <div className={styles.gl}>
              {list.map((room) => (
                <GalaCard key={room.roomId} room={room} group={group} />
              ))}
            </div>
          </section>
        );
      })}
    </MeShell>
  );
}
