/**
 * Gala settings mock slice (the host's permission toggles). Owned by the settings lane.
 * Defaults match otw-server Room.java (all on).
 * TODO(backend): GET /rooms/{roomId} already returns `permissions` (gala-store's room query);
 * PATCH /rooms/{roomId} saves them. Drop this slice when the settings tab is wired.
 */
import { defineSlice } from './store';
import type { RoomPermissionsVM } from './types';

const DEFAULTS = (): RoomPermissionsVM => ({
  membersCanEditPlan: true,
  membersCanAddPhotos: true,
  membersCanDeleteOwnPhotos: true,
  locationSharingEnabled: true,
});

export const settings = defineSlice<RoomPermissionsVM>({
  key: 'settings',
  version: 1,
  empty: DEFAULTS,
  demo: DEFAULTS,
});
