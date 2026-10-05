'use client';

/**
 * Query keys for a gala and the realtime subscription that keeps them fresh.
 *
 * The backend broadcasts on the private channel room:{roomId} after each commit (master plan
 * §8). Events only invalidate the matching queries: the paginated GET stays the source of truth,
 * so a duplicate or missed event just means one extra (or one later) refetch. While the channel
 * isn't connected the queries fall back to polling.
 *
 * The same channel carries presence ("Online now"): each open gala tracks its user id.
 */
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/api/supabase';

export type GalaFeature =
  | 'members'
  | 'summary'
  | 'itinerary'
  | 'checklist'
  | 'budget'
  | 'expenses'
  | 'settlement'
  | 'chat'
  | 'locations'
  | 'photos'
  | 'couple';

/** ['room', roomId] is the room itself; every feature list lives under it. */
export const roomKey = (roomId: string | null) => ['room', roomId] as const;
export const featureKey = (roomId: string | null, feature: GalaFeature) => ['room', roomId, feature] as const;

/** Poll interval while realtime is down (or not configured). */
export const POLL_MS = 15_000;

/** Which queries an event touches. The summary (dashboard counts) follows almost everything. */
function affected(event: string): GalaFeature[] | 'room' {
  const [head, sub] = event.split('.');
  switch (head) {
    case 'room':
      return 'room';
    case 'member':
      return ['members', 'summary'];
    case 'itinerary':
      return ['itinerary', 'summary'];
    case 'checklist':
      return ['checklist', 'summary'];
    case 'budget':
      return ['budget', 'summary'];
    case 'expense':
      return ['expenses', 'settlement', 'summary'];
    case 'settlement':
      return ['settlement', 'summary'];
    case 'chat':
      return sub === 'reaction' ? ['chat'] : ['chat', 'summary'];
    case 'location':
      return ['locations'];
    case 'photo':
      return ['photos', 'summary'];
    case 'couple':
      return ['couple'];
    default:
      return 'room';
  }
}

export interface RoomRealtime {
  /** True while the channel is connected (queries can stop polling). */
  live: boolean;
  /** User ids with the gala open right now (presence). */
  online: ReadonlySet<string>;
}

const NOBODY: ReadonlySet<string> = new Set();

/** Subscribes to room:{roomId} (broadcast + presence) while mounted. */
export function useRoomRealtime(roomId: string | null | undefined): RoomRealtime {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);
  const [online, setOnline] = useState<ReadonlySet<string>>(NOBODY);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let connectedBefore = false;
    const sb = supabase();

    (async () => {
      // Private channels authorize with the user's JWT (RLS on realtime.messages).
      await sb.realtime.setAuth().catch(() => undefined);
      const me = (await sb.auth.getSession().catch(() => null))?.data.session?.user.id;
      if (cancelled) return;
      const ch = sb.channel(`room:${roomId}`, { config: { private: true, presence: { key: me ?? '' } } });
      channel = ch;
      ch.on('presence', { event: 'sync' }, () => {
        if (!cancelled) setOnline(new Set(Object.keys(ch.presenceState()).filter(Boolean)));
      })
        .on('broadcast', { event: '*' }, ({ event }) => {
          const hit = affected(String(event));
          if (hit === 'room') {
            void qc.invalidateQueries({ queryKey: roomKey(roomId) });
          } else {
            hit.forEach((f) => void qc.invalidateQueries({ queryKey: featureKey(roomId, f) }));
          }
        })
        .subscribe((status) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            setLive(true);
            if (me) void ch.track({ at: new Date().toISOString() }).catch(() => undefined);
            // Reconnected: catch up on anything missed while disconnected.
            if (connectedBefore) void qc.invalidateQueries({ queryKey: roomKey(roomId) });
            connectedBefore = true;
          } else {
            setLive(false);
          }
        });
    })();

    return () => {
      cancelled = true;
      setLive(false);
      setOnline(NOBODY);
      if (channel) void sb.removeChannel(channel);
    };
  }, [roomId, qc]);

  return { live, online };
}
