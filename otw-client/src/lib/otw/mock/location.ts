/**
 * Live location ("Who's OTW?") mock slice. Owned by the location lane: add actions below.
 * TODO(backend): GET /rooms/{roomId}/locations replaces `locations` (PUT/DELETE .../location to share/stop);
 * RoomMemberDto.travelStatus (PUT .../members/me/travel-status) replaces `travel`.
 */
import { defineSlice } from './store';
import { mockUserId, DEMO_MEMBERS } from './members';
import type { LocationVM, MemberLocationVM, TravelStatus } from './types';

/**
 * Demo gala day around Baguio. The reference has no per-member coordinates, so these are
 * illustrative (CJ on the way, Sam almost there, Bea already there, as in the proto journey).
 */
const PINS: [name: string, lat: number, lng: number, status: TravelStatus][] = [
  ['CJ', 16.3402, 120.5161, 'ON_THE_WAY'],
  ['Alex', 15.4812, 120.5903, 'ON_THE_WAY'],
  ['Sam', 16.3987, 120.6012, 'ALMOST_THERE'],
  ['Bea', 16.4125, 120.5937, 'ARRIVED'],
];

function demoLocation(): LocationVM {
  const at = '2026-11-14T09:41:00+08:00';
  const locations: MemberLocationVM[] = PINS.map(([n, lat, lng]) => ({
    userId: mockUserId(n),
    lat,
    lng,
    shareMode: 'LIVE',
    expiresAt: '2026-11-14T21:00:00+08:00',
    updatedAt: at,
  }));
  const travel: Record<string, TravelStatus> = {};
  DEMO_MEMBERS.forEach((m) => (travel[m.userId] = 'STILL_HOME'));
  PINS.forEach(([n, , , s]) => (travel[mockUserId(n)] = s));
  return { locations, travel };
}

export const location = defineSlice<LocationVM>({
  key: 'location',
  version: 1,
  empty: () => ({ locations: [], travel: {} }),
  demo: demoLocation,
});
