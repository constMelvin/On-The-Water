import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { findRoomId, previewRoom } from '@/api/galas';
import type { RoomPreviewDto } from '@/api/types';
import { JoinFlow, lookupError } from '@/components/JoinFlow';
import { Loading } from '@/components/ui';

/** Deep link / QR entry by gala code: open it if I'm a member, otherwise Join a Gala with the code looked up. */
export default function OpenByCode() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [join, setJoin] = useState<{ event: RoomPreviewDto | null; error: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const roomId = await findRoomId(code).catch(() => null);
      if (!alive) return;
      if (roomId) return router.replace({ pathname: '/gala/[roomId]', params: { roomId } });
      try {
        const event = await previewRoom(code);
        if (alive) setJoin(event.full ? { event: null, error: 'This gala is already full.' } : { event, error: '' });
      } catch (e) {
        if (alive) setJoin({ event: null, error: lookupError(e) });
      }
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  if (!join) return <Loading />;
  return <JoinFlow initialCode={code} initialEvent={join.event} initialError={join.error} />;
}
