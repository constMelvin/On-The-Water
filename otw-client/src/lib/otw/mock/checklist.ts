/**
 * Checklist mock slice. Owned by the checklist lane: add actions below.
 * TODO(backend): GET /rooms/{roomId}/checklist (paginated) replaces this slice.
 */
import { ITEMS0 } from '../data';
import { defineSlice, mockId } from './store';
import { DEMO_ROOM_ID, demoTime, mockUserId } from './members';
import type { ChecklistItemVM } from './types';

/*
 * TODO(backend): checklist CRUD with version. POST /rooms/{roomId}/checklist to add,
 * PATCH /rooms/{roomId}/checklist/{id} (send `version`; a stale one is a 409 ->
 * "Couldn't update that item. Try again." and refetch), DELETE to remove. Realtime
 * checklist.* events on room:{roomId} after commit. User ids here are mock ids from
 * mockUserId(nickname); the real ones come from RoomMemberDto.userId.
 */

export const checklist = defineSlice<ChecklistItemVM[]>({
  key: 'checklist',
  version: 1,
  empty: () => [],
  demo: () =>
    ITEMS0.map((it, i) => ({
      id: `demo-item-${i + 1}`,
      roomId: DEMO_ROOM_ID,
      label: it.t,
      assignedTo: it.w ? mockUserId(it.w) : null,
      isDone: it.d === 1,
      doneBy: it.d === 1 && it.w ? mockUserId(it.w) : null,
      doneAt: it.d === 1 ? demoTime('Sep 28', '7:00 PM') : null,
      version: 0,
      createdAt: demoTime('Sep 26', '9:00 PM'),
    })),
});

/* ---------------- actions ---------------- */

/** Applies a change to one item and bumps its version, like the server's optimistic lock. */
function update(code: string, id: string, patch: (it: ChecklistItemVM) => Partial<ChecklistItemVM>): void {
  checklist.set(code, (items) =>
    items.map((it) => (it.id === id ? { ...it, ...patch(it), version: it.version + 1 } : it))
  );
}

/** Appends an item. A blank name becomes "New item" (reference save-item). */
export function addItem(code: string, label: string, assignedTo: string | null): void {
  checklist.set(code, (items) => [
    ...items,
    {
      id: mockId(),
      roomId: items[0]?.roomId ?? '',
      label: label.trim() || 'New item',
      assignedTo,
      isDone: false,
      doneBy: null,
      doneAt: null,
      version: 0,
      createdAt: new Date().toISOString(),
    },
  ]);
}

/**
 * Checks / unchecks an item as `userId`. Returns true when this check finished the list
 * (every item done), so the view can fire the burst.
 */
export function toggleDone(code: string, id: string, userId: string): boolean {
  update(code, id, (it) =>
    it.isDone
      ? { isDone: false, doneBy: null, doneAt: null }
      : { isDone: true, doneBy: userId, doneAt: new Date().toISOString() }
  );
  const items = checklist.get(code);
  // Unchecking can never leave everything done, so "all done now" means this check finished it.
  return items.length > 0 && items.every((it) => it.isDone);
}

/** Claim: assigns an unassigned item to `userId`. */
export function claimItem(code: string, id: string, userId: string): void {
  update(code, id, () => ({ assignedTo: userId }));
}

export function deleteItem(code: string, id: string): void {
  checklist.set(code, (items) => items.filter((it) => it.id !== id));
}
