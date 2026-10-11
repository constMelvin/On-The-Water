'use client';

import { useSyncExternalStore } from 'react';

/** Whether the "Sure ka na ba?" confirm is open. One dialog (LogoutDialog, mounted in the root layout) serves every screen. */
let open = false;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (open === next) return;
  open = next;
  listeners.forEach((l) => l());
}

export const requestLogOut = () => set(true);
export const cancelLogOut = () => set(false);

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export const useLogOutOpen = () =>
  useSyncExternalStore(
    subscribe,
    () => open,
    () => false
  );
