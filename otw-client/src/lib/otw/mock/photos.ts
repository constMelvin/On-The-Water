/**
 * Gala Dump mock slice. Owned by the photos lane: add actions below. Photos are
 * metadata only (no binaries); the mock tiles are colored placeholders.
 * TODO(backend): GET /rooms/{roomId}/photos (paginated) replaces this slice; POST registers a driveFileId.
 */
import { defineSlice } from './store';
import { DEMO_ROOM_ID, mockUserId } from './members';
import type { MockTone, PhotoVM } from './types';

/** Reference PH (references/otw/src/data.js), ported here because lib/otw/data.ts doesn't have it. */
const PH: { h: number; c: MockTone; t: string; w: string; tm: string }[] = [
  { h: 210, c: 'blossom', t: 'Bus selfie', w: 'CJ', tm: '05:48' },
  { h: 270, c: 'zest', t: 'Strawberry haul', w: 'Bea', tm: '10:52' },
  { h: 180, c: 'teal', t: 'Blurry but iconic', w: 'Josh', tm: '11:03' },
  { h: 300, c: 'rosy', t: 'Session Road', w: 'Sam', tm: '12:41' },
  { h: 220, c: 'zest', t: 'Lunch, finally', w: 'Jamie', tm: '13:05' },
  { h: 250, c: 'blossom', t: 'Send mo nga', w: 'Alex', tm: '14:17' },
  { h: 190, c: 'rosy', t: 'Boat crew', w: 'Merylle', tm: '15:22' },
  { h: 280, c: 'teal', t: 'Burnham golden hour', w: 'CJ', tm: '16:48' },
  { h: 210, c: 'blossom', t: 'Random candid', w: 'Bea', tm: '17:30' },
  { h: 260, c: 'zest', t: 'Night market', w: 'Sam', tm: '19:02' },
  { h: 180, c: 'rosy', t: 'Group shot #14', w: 'Merylle', tm: '20:14' },
  { h: 230, c: 'teal', t: 'Uwian na', w: 'Jamie', tm: '21:20' },
];

export const photos = defineSlice<PhotoVM[]>({
  key: 'photos',
  version: 1,
  empty: () => [],
  demo: () =>
    PH.map((p, i) => ({
      id: `demo-photo-${i + 1}`,
      roomId: DEMO_ROOM_ID,
      driveFileId: `demo-drive-${i + 1}`,
      uploadedBy: mockUserId(p.w),
      caption: p.t,
      status: 'READY',
      createdAt: `2026-11-14T${p.tm}:00+08:00`,
      tone: p.c,
      height: p.h,
    })),
});
