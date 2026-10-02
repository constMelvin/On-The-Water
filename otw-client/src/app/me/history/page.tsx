'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Icon, PageHead, blob } from '@/components/otw';
import { GalaCard } from '@/components/me/GalaCard';
import { MeShell } from '@/components/me/MeShell';
import styles from '@/components/me/me.module.css';
import { isApiError } from '@/lib/api/client';
import { meKeys, useMyRoomStats, useMyRooms } from '@/lib/api/me-queries';
import { restoreRoom } from '@/lib/api/rooms';
import { toast } from '@/lib/otw/feedback';

/** Gala History: what you made happen, plus the plans still in the drawer (archived galas). */

function Tile({ tone, value, label }: { tone: string; value: number | undefined; label: string }) {
  return (
    <div className={`${styles.tile} ${tone}`}>
      <b>{value ?? '-'}</b>
      <span>{label}</span>
    </div>
  );
}

function reviveError(e: unknown): string {
  if (isApiError(e, 'ROOM_NOT_FOUND')) return 'That gala is gone.';
  if (isApiError(e) && e.status === 403) return 'Only the Gala Leader can revive this.';
  if (isApiError(e) && e.status === 409) return 'This gala changed. Refresh and try again.';
  return 'Hindi na-revive. Try again.';
}

export default function HistoryPage() {
  const qc = useQueryClient();
  const stats = useMyRoomStats();
  const completed = useMyRooms('completed');
  const archived = useMyRooms('archived');
  const [reviving, setReviving] = useState<ReadonlySet<string>>(new Set());

  const revive = useMutation({
    mutationFn: (roomId: string) => restoreRoom(roomId),
    onMutate: (roomId) => setReviving((s) => new Set(s).add(roomId)),
    onSuccess: (_d, roomId) => {
      toast('Revived. Balik na sa plano.');
      return Promise.all([
        qc.invalidateQueries({ queryKey: meKeys.all }),
        qc.invalidateQueries({ queryKey: ['room', roomId] }),
      ]);
    },
    onError: (e) => toast(reviveError(e)),
    onSettled: (_d, _e, roomId) =>
      setReviving((s) => {
        const next = new Set(s);
        next.delete(roomId);
        return next;
      }),
  });

  const queries = [stats, completed, archived];
  const loading = queries.some((q) => q.isPending);
  const failed = queries.filter((q) => q.isError);
  const done = completed.data ?? [];
  const drawer = archived.data ?? [];

  return (
    <MeShell active="history">
      <PageHead title="Gala History" sub="Everything you made happen, plus the plans still in the drawer." />

      {failed.length > 0 && (
        <article className={`card ${styles.gcard}`} role="alert" style={{ marginTop: 26 }}>
          <span className={styles.gdate} aria-hidden="true">
            <Icon name="alert" size={24} />
          </span>
          <div className={styles.gcb}>
            <h3>Hindi ma-load ang history mo.</h3>
            <p>Check your connection, then try again.</p>
          </div>
          <Button sm variant="teal" onClick={() => failed.forEach((q) => q.refetch())}>
            <Icon name="refresh" size={16} /> Try again
          </Button>
        </article>
      )}

      <div className={styles.tiles}>
        <Tile tone="c-zest" value={stats.data?.completed} label="made it happen" />
        <Tile tone="c-blossom" value={stats.data?.people} label="people" />
        <Tile tone="c-teal" value={stats.data?.archived} label="in Mga Drawing" />
      </div>

      {loading && (
        <div className={styles.gl} role="status" aria-busy="true" aria-label="Loading your history" style={{ marginTop: 26 }}>
          {[0, 1].map((i) => (
            <div key={i} className={`sk ${styles.skel}`} aria-hidden="true" />
          ))}
        </div>
      )}

      <section aria-label="Completed">
        <h3 className={styles.gh}>Completed</h3>
        {!completed.isPending && done.length === 0 && !completed.isError && (
          <div className={styles.gate}>
            <span className="ico xl" style={blob(2)}>
              <Icon name="check" size={44} />
            </span>
            <p className="sub">Wala pang natapos na gala. Soon.</p>
          </div>
        )}
        <div className={styles.gl}>
          {done.map((room) => (
            <GalaCard key={room.roomId} room={room} group="done" />
          ))}
        </div>
      </section>

      <section aria-label="Mga Drawing">
        <h3 className={styles.gh}>Mga Drawing</h3>
        <p className={`fine ${styles.fine}`}>Plans that got shelved. No judgment, and you can revive any of them.</p>
        {!archived.isPending && drawer.length === 0 && !archived.isError && (
          <p className="fine">Walang nakatabi. Lahat ng plano mo, buhay pa.</p>
        )}
        <div className={styles.gl}>
          {drawer.map((room) => (
            <GalaCard
              key={room.roomId}
              room={room}
              group="draw"
              action={
                room.myRole === 'HOST' ? (
                  <Button
                    sm
                    variant="teal"
                    disabled={reviving.has(room.roomId)}
                    onClick={() => revive.mutate(room.roomId)}
                    aria-label={`Revive ${room.title}`}
                  >
                    {reviving.has(room.roomId) ? 'Reviving...' : 'Revive'}
                  </Button>
                ) : null
              }
            />
          ))}
        </div>
      </section>
    </MeShell>
  );
}
