'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import { Button, Icon, PageHead, Tag, blob, type TagVariant } from '@/components/otw';
import type { IconName } from '@/lib/otw/icons';
import { forgetRoom, galaRoute, listRooms, roomsSnapshot, subscribeRooms } from '@/lib/otw/gala-registry';
import { toast } from '@/lib/otw/feedback';
import { isApiError } from '@/lib/api/client';
import { getRoom, type GalaPhase, type RoomDto } from '@/lib/api/rooms';
import { useAccount } from '@/lib/otw/auth-mock';
import { useLogOut } from '@/components/gala/useLogOut';
import styles from './mygalas.module.css';

/**
 * My Galas (STUB for A5). Lists the galas on THIS DEVICE: the code -> roomId map from
 * gala-registry, with each card's details from the existing GET /rooms/{id}.
 * The full account version (all devices, calendar views, account shell, login gate) is B12.
 *
 * TODO(backend): GET /me/rooms for the real list (every gala on the account, any device).
 */

type Group = 'ongoing' | 'upcoming' | 'done';

const GROUP_OF: Record<GalaPhase, Group> = { GALA_DAY: 'ongoing', PLANNING: 'upcoming', DONE: 'done' };
const GROUPS: [Group, string][] = [
  ['ongoing', 'Ongoing now'],
  ['upcoming', 'Coming up'],
  ['done', 'Completed'],
];
/** Status tag per group (reference STAT). */
const STAT: Record<Group, [label: string, variant: TagVariant, icon: IconName]> = {
  ongoing: ['Ongoing', 'l-there', 'burst'],
  upcoming: ['Upcoming', 'st-m', 'calendar'],
  done: ['Completed', 'st-g', 'check'],
};

/** Server render and hydration see "not read yet", so the page never flashes the empty state. */
const NOT_READ = '';

const noRetryOn4xx = (n: number, e: unknown) => !(isApiError(e) && e.status >= 400 && e.status < 500) && n < 2;

/** "14" + "Nov" from yyyy-mm-dd (local date, no timezone shift). */
function dateChip(iso: string): { day: number; mon: string } | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { day: d, mon: new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short' }) };
}

function GalaCard({ code, room }: { code: string; room: RoomDto }) {
  const group = GROUP_OF[room.phase];
  const [label, variant, icon] = STAT[group];
  const leader = room.myRole === 'HOST';
  const chip = dateChip(room.startDate);
  const people = room.memberCount ?? 0;

  return (
    <article className={`card ${styles.gcard}`}>
      <span className={styles.gdate} aria-hidden="true">
        {chip ? (
          <>
            {chip.day}
            <i>{chip.mon}</i>
          </>
        ) : (
          <i>TBD</i>
        )}
      </span>
      <div className={styles.gcb}>
        <h3>{room.title}</h3>
        <p>
          <Icon name="pin" size={14} />
          {room.destination}
          <Icon name="users" size={14} />
          {people} {people === 1 ? 'person' : 'people'}
        </p>
        <div className={styles.tags}>
          <Tag variant={variant} icon={icon}>
            {label}
          </Tag>
          <Tag variant={leader ? 'zest' : 'blossom'} icon={leader ? 'crown' : 'user'}>
            {leader ? 'Leader' : 'Member'}
          </Tag>
        </div>
      </div>
      {group === 'done' ? (
        <Link className="btn sm cream" href={`${galaRoute(code)}/recap`} aria-label={`Recap of ${room.title}`}>
          Recap
        </Link>
      ) : (
        <Link className="btn sm teal" href={galaRoute(code)} aria-label={`Open ${room.title}`}>
          Open
        </Link>
      )}
    </article>
  );
}

/** A gala this device remembers but the backend no longer lets us read (removed, left, deleted). */
function GoneCard({ code }: { code: string }) {
  return (
    <article className={`card ${styles.gcard}`}>
      <span className={styles.gdate} aria-hidden="true">
        <Icon name="alert" size={24} />
      </span>
      <div className={styles.gcb}>
        <h3 className={styles.code}>{code}</h3>
        <p>Wala ka na sa gala na &apos;to.</p>
      </div>
      <Button
        sm
        variant="ghost"
        onClick={() => {
          forgetRoom(code);
          toast('Tinanggal na sa device na ’to.');
        }}
      >
        Tanggalin dito
      </Button>
    </article>
  );
}

function ErrorCard({ code, onRetry }: { code: string; onRetry: () => void }) {
  return (
    <article className={`card ${styles.gcard}`}>
      <span className={styles.gdate} aria-hidden="true">
        <Icon name="alert" size={24} />
      </span>
      <div className={styles.gcb}>
        <h3 className={styles.code}>{code}</h3>
        <p>Hindi ma-load ang gala na &apos;to. Try again.</p>
      </div>
      <Button sm variant="teal" onClick={onRetry}>
        <Icon name="refresh" size={16} /> Try again
      </Button>
    </article>
  );
}

export default function MyGalasPage() {
  const { signedIn, name, username } = useAccount();
  const logOut = useLogOut();
  const snapshot = useSyncExternalStore(subscribeRooms, roomsSnapshot, () => NOT_READ);
  const rooms = useMemo(() => (snapshot === NOT_READ ? [] : listRooms(snapshot)), [snapshot]);

  // Same query key as the gala store's room query, so an open gala's data is shared.
  const queries = useQueries({
    queries: rooms.map((r) => ({
      queryKey: ['room', r.roomId],
      queryFn: () => getRoom(r.roomId),
      retry: noRetryOn4xx,
      staleTime: 30_000,
    })),
  });

  const loading = snapshot === NOT_READ;
  const loaded = rooms.map((r, i) => ({ ...r, q: queries[i] }));
  const ready = loaded.filter((x) => x.q?.data);
  const pending = loaded.filter((x) => x.q?.isPending);
  const gone = loaded.filter((x) => {
    const err = x.q?.error;
    return isApiError(err) && (err.status === 403 || err.status === 404);
  });
  const failed = loaded.filter((x) => x.q?.isError && !gone.includes(x));

  const byGroup = (g: Group) =>
    ready
      .filter((x) => GROUP_OF[x.q.data!.phase] === g)
      .sort((a, b) => {
        const d = a.q.data!.startDate.localeCompare(b.q.data!.startDate);
        return g === 'done' ? -d : d; // completed: most recent first
      });

  const empty = !loading && rooms.length === 0;

  return (
    <main className={`bg-cream ${styles.page}`}>
      <div className={styles.inner}>
        <header className={styles.top}>
          <Link href="/" className={styles.brand} aria-label="OTW home">
            <Icon name="pin" size={26} />
            <b>OTW</b>
          </Link>
          <div className={styles.topActions}>
            {signedIn && <span className={styles.who}>Hi, {name || username}</span>}
            <Link className="btn sm ghost" href="/">
              Back to OTW
            </Link>
            {signedIn && (
              <Button sm variant="cream" onClick={logOut}>
                <Icon name="back" size={16} /> Log out
              </Button>
            )}
          </div>
        </header>

        <div className={styles.headRow}>
          <PageHead
            title="Your Gala Calendar"
            sub="Keep track of what's coming up, what's being planned, and what's already happened."
          />
          <Link className="btn sm rosy" href="/plan">
            <Icon name="plus" size={18} /> Plan a Gala
          </Link>
        </div>

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

        {GROUPS.map(([g, title]) => {
          const list = byGroup(g);
          if (!list.length) return null;
          return (
            <section key={g} aria-label={title}>
              <h3 className={styles.gh}>{title}</h3>
              <div className={styles.gl}>
                {list.map((x) => (
                  <GalaCard key={x.roomId} code={x.code} room={x.q.data!} />
                ))}
              </div>
            </section>
          );
        })}

        {pending.length > 0 && (
          <div className={styles.gl} role="status" aria-busy="true" aria-label="Loading galas" style={{ marginTop: 26 }}>
            {pending.map((x) => (
              <div key={x.roomId} className={`sk ${styles.skel}`} aria-hidden="true" />
            ))}
          </div>
        )}

        {(gone.length > 0 || failed.length > 0) && (
          <section aria-label="Galas na hindi ma-open">
            <h3 className={styles.gh}>Hindi ma-open</h3>
            <div className={styles.gl}>
              {gone.map((x) => (
                <GoneCard key={x.roomId} code={x.code} />
              ))}
              {failed.map((x) => (
                <ErrorCard key={x.roomId} code={x.code} onRetry={() => x.q.refetch()} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
