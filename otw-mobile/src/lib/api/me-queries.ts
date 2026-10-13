
import { useQuery } from '@tanstack/react-query';
import { isApiError } from './client';
import { getAllMyRooms, getMyRoomStats, type MyRoomsView } from './me';

/** Query keys for the account area. Everything lives under ['account'] so one invalidate refreshes it all. */
export const meKeys = {
  all: ['account'] as const,
  rooms: (view: MyRoomsView) => ['account', 'rooms', view] as const,
  stats: ['account', 'stats'] as const,
};

/** Don't retry client errors (401 redirects to login in api(); 4xx won't fix itself). */
const retry = (n: number, e: unknown) => !(isApiError(e) && e.status >= 400 && e.status < 500) && n < 2;

export const useMyRooms = (view: MyRoomsView) =>
  useQuery({ queryKey: meKeys.rooms(view), queryFn: () => getAllMyRooms(view), staleTime: 30_000, retry });

export const useMyRoomStats = () =>
  useQuery({ queryKey: meKeys.stats, queryFn: getMyRoomStats, staleTime: 30_000, retry });
