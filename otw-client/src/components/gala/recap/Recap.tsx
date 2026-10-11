'use client';

/**
 * Recap of a finished gala. Reference: src/proto2.js views.completed, completed-*.png.
 * Every number comes from GET /rooms/{roomId}/summary.
 */
import Link from 'next/link';
import { Icon, blob } from '@/components/otw';
import { peso } from '@/lib/otw/data';
import { useGala } from '@/lib/otw/gala-store';
import { ErrorState, Skeleton } from '../States';
import { galaHref } from '../nav';
import s from './recap.module.css';

export function Recap() {
  const { gala, summary, liveState, viewState, retry } = useGala();
  const state = viewState !== 'default' ? viewState : liveState;

  if (state === 'error' && !summary) return <ErrorState kind="completed" onRetry={retry} />;
  if (!summary || state === 'loading') return <Skeleton label="Loading the recap" />;

  const href = (seg: string) => galaHref(gala.code, seg);
  const went = summary.rsvp.going;

  return (
    <>
      <section className={`dhero bg-rosy ${s.hero}`}>
        <span className={`ico xl ${s.cel}`} style={blob(0)}>
          <Icon name="burst" size={44} />
        </span>
        <h1 className="h1s">You made it happen.</h1>
        <p className="lead2">From “G tayo?” to an actual day on the calendar.</p>
      </section>
      <div className={s.tiles}>
        <div className={`${s.tile} c-teal`}>
          <b>{went}</b>
          <span>{went === 1 ? 'person went' : 'people went'}</span>
        </div>
        <div className={`${s.tile} c-zest`}>
          <b>{summary.itineraryStops}</b>
          <span>stops on the route</span>
        </div>
        <div className={`${s.tile} c-blossom`}>
          <b>{peso(summary.totalSpent)}</b>
          <span>spent{summary.settled ? ' · all settled' : ''}</span>
        </div>
        <div className={`${s.tile} c-cream`}>
          <b>{summary.photoCount}</b>
          <span>photos in the Dump</span>
        </div>
      </div>
      {summary.memberCount >= 3 && (
        <section className={`${s.awards} bg-zest`} aria-label="Barkada Awards">
          <span className="ico" style={blob(1)} aria-hidden="true">
            <Icon name="crown" size={28} />
          </span>
          <div>
            <h2>Barkada Awards</h2>
            <p>Vote for the bida ng barkada, then see who won.</p>
          </div>
          <Link className="btn rosy" href={href('awards')}>
            Open the awards
          </Link>
        </section>
      )}
      <div className={s.acts}>
        <Link className="btn teal" href={href('dump')}>
          View Gala Dump
        </Link>
        <Link className="btn zest" href={href('ambagan')}>
          View Expenses
        </Link>
        <Link className="btn cream" href={href('route')}>
          View Itinerary
        </Link>
        <Link className="btn rosy" href="/plan">
          Plan Another Gala
        </Link>
      </div>
      <p className={s.closing}>Until the next “G tayo?”</p>
    </>
  );
}
