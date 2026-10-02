/**
 * Itinerary ("The plan") mock slice. Owned by the itinerary lane: add actions below.
 * TODO(backend): GET /rooms/{roomId}/itinerary (paginated) replaces this slice.
 */
import { STOPS0 } from '../data';
import { defineSlice } from './store';
import { DEMO_ROOM_ID, demoTime, mockUserId } from './members';
import type { ItineraryItemVM, StopType } from './types';

const TYPE: Record<string, StopType> = { 'Meet-up': 'MEET_UP', Activity: 'ACTIVITY', Food: 'FOOD' };

export const itinerary = defineSlice<ItineraryItemVM[]>({
  key: 'itinerary',
  version: 1,
  empty: () => [],
  demo: () =>
    STOPS0.map((s, i) => ({
      id: `demo-stop-${i + 1}`,
      roomId: DEMO_ROOM_ID,
      title: s.p,
      notes: s.n || null,
      startsAt: demoTime('Nov 14', s.t),
      stopType: TYPE[s.a] ?? 'ACTIVITY',
      position: i,
      createdBy: mockUserId(s.w),
      completed: false,
      version: 0,
      createdAt: demoTime('Sep 27', '8:31 PM'),
      updatedAt: demoTime('Sep 27', '8:31 PM'),
    })),
});
