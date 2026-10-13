/**
 * Toast + sparkle burst (mobile port of the web's feedback.ts). Same call sites: `toast(msg, 'err')`,
 * `burstEl(...)`. The toast is a module-level store drawn by <ToastHost/> (app/_layout.tsx); a burst shows
 * the sparkle pop on the next toast host frame.
 */
import { useSyncExternalStore } from 'react';

export type ToastKind = '' | 'err';

export interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

let current: ToastState | null = null;
let burstId = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let nextId = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Bottom pill that replaces any current toast and clears after ~2.6 s. */
export function toast(message: string, kind: ToastKind = ''): void {
  current = { id: ++nextId, message, kind };
  notify();
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    notify();
  }, 2600);
}

/** Sparkles from the middle of the screen (the web bursts from the pressed button). */
export function burst(): void {
  burstId++;
  notify();
}

/** Same as burst(); the element argument is accepted for parity with the web and ignored. */
export function burstEl(_el?: unknown): void {
  burst();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export const useToast = () => useSyncExternalStore(subscribe, () => current);
export const useBurstId = () => useSyncExternalStore(subscribe, () => burstId);
