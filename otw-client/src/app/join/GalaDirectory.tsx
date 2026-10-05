'use client';

/**
 * Join a Gala's list: every active gala (GET /rooms/directory), upcoming first, with a search box.
 * "Details" opens the gala's preview (GET /rooms/preview: who's going); "Join" starts the same
 * confirm step as typing its code. Joining still needs the Gala Password.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getDirectory, previewRoom, type DirectoryRoomDto } from '@/lib/api/rooms';
import { isApiError } from '@/lib/api/client';
import { daysBetween, formatRange, galaRoute, normCode } from '@/lib/otw/gala-registry';
import styles from './join.module.css';

const noRetryOn4xx = (n: number, e: Error) => !(isApiError(e) && e.status >= 400 && e.status < 500) && n < 2;

/** Today as yyyy-mm-dd in Manila (gala dates are Manila calendar dates). */
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());

export interface GalaDirectoryProps {
  /** Opens the confirm step (password + nickname) for this gala's code. */
  onPick: (code: string) => void;
  disabled?: boolean;
}

export function GalaDirectory({ onPick, disabled }: GalaDirectoryProps) {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  // Search after typing pauses, not on every key.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const dir = useInfiniteQuery({
    queryKey: ['directory', q],
    // A few at a time ("Show more galas" for the rest) so the code form below stays close: the
    // list grows with the page instead of scrolling inside it.
    queryFn: ({ pageParam }) => getDirectory(q, pageParam, 5),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    retry: noRetryOn4xx,
    staleTime: 30_000,
  });
  const galas: DirectoryRoomDto[] = dir.data?.pages.flatMap((p) => p.items) ?? [];
  const today = todayIso();

  return (
    <section className={styles.dir} aria-label="Galas you can join">
      <input
        type="search"
        className={styles.dirSearch}
        placeholder="Search by gala name or place"
        aria-label="Search galas"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {dir.isPending ? (
        <p className={styles.dirNote}>Looking for galas…</p>
      ) : dir.isError ? (
        <p className={styles.dirNote} role="alert">
          {dir.error instanceof Error ? dir.error.message : "Couldn't load the galas."}{' '}
          <button type="button" className={styles.dirMore} onClick={() => void dir.refetch()}>
            Try again
          </button>
        </p>
      ) : galas.length === 0 ? (
        <p className={styles.dirNote}>
          {q ? 'No gala matches that.' : 'No galas yet.'} Got a code from your group chat? Use it below.
        </p>
      ) : (
        <ul className={styles.dirList}>
          {galas.map((g) => {
            const code = normCode(g.roomCode);
            const finished = (g.endDate ?? g.startDate) < today;
            const isOpen = open === g.roomCode;
            return (
              <li key={g.roomCode} className={styles.dirItem}>
                <div className={styles.dirRow}>
                  <div className={styles.dirMain}>
                    <b>{g.title}</b>
                    <span>
                      {formatRange(g.startDate, daysBetween(g.startDate, g.endDate))} · {g.destination}
                    </span>
                    <span>
                      {`${g.memberCount} ${g.memberCount === 1 ? 'person' : 'people'}`}
                      {g.hostNickname ? ` · led by ${g.hostNickname}` : ''}
                      {finished ? ' · finished' : ''}
                    </span>
                  </div>
                  <div className={styles.dirActions}>
                    <button
                      type="button"
                      className={styles.dirDetails}
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : g.roomCode)}
                    >
                      {isOpen ? 'Hide' : 'Details'}
                    </button>
                    {g.alreadyMember ? (
                      <Link className={styles.dirBtnGhost} href={galaRoute(code)}>
                        Open
                      </Link>
                    ) : g.full ? (
                      <span className={styles.dirFull}>Full</span>
                    ) : (
                      <button type="button" className={styles.dirBtn} disabled={disabled} onClick={() => onPick(code)}>
                        Join
                      </button>
                    )}
                  </div>
                </div>
                {isOpen && <GalaDetails gala={g} />}
              </li>
            );
          })}
        </ul>
      )}

      {dir.hasNextPage && (
        <button
          type="button"
          className={styles.dirMore}
          disabled={dir.isFetchingNextPage}
          onClick={() => void dir.fetchNextPage()}
        >
          {dir.isFetchingNextPage ? 'Loading…' : 'Show more galas'}
        </button>
      )}
    </section>
  );
}

/** The expanded card: code, full dates, and who's going (GET /rooms/preview, up to 12 names). */
function GalaDetails({ gala }: { gala: DirectoryRoomDto }) {
  const preview = useQuery({
    queryKey: ['preview', gala.roomCode],
    queryFn: () => previewRoom(gala.roomCode),
    retry: noRetryOn4xx,
    staleTime: 30_000,
  });
  const names = preview.data?.nicknames ?? [];
  const more = (preview.data?.memberCount ?? 0) - names.length;

  return (
    <div className={styles.dirDetailBody}>
      <dl className={styles.dirFacts}>
        <div>
          <dt>Gala code</dt>
          <dd>{normCode(gala.roomCode)}</dd>
        </div>
        <div>
          <dt>When</dt>
          <dd>{formatRange(gala.startDate, daysBetween(gala.startDate, gala.endDate))}</dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>{gala.destination}</dd>
        </div>
      </dl>
      <div>
        <span className={styles.dirFactLabel}>Who&apos;s going</span>
        {preview.isPending ? (
          <p className={styles.dirNote}>Loading…</p>
        ) : preview.isError ? (
          <p className={styles.dirNote}>Couldn&apos;t load who&apos;s going.</p>
        ) : names.length ? (
          <div className={styles.attendeeChips}>
            {names.map((n, i) => (
              <span key={n} className={`${styles.attendeeChip} ${styles[`chipColor${i % 5}`]}`}>
                {n}
              </span>
            ))}
            {more > 0 && <span className={styles.dirNote}>+{more} more</span>}
          </div>
        ) : (
          <p className={styles.dirNote}>Nobody yet.</p>
        )}
      </div>
    </div>
  );
}
