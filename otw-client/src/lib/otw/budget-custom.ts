'use client';

/**
 * Custom Gastos categories, kept on THIS device only: localStorage['otw:budget-custom:<roomId>'].
 * The real budget endpoint stores a fixed five (transport, stay, food, activities, other), so these
 * extra rows and their amounts never leave the browser. Never throws: blocked or full storage just
 * means they aren't remembered.
 *
 * TODO(backend): persist custom budget categories on the real endpoint (a `customCategories[]` on the
 * budget DTO, summed into estimatedAmount / perPerson, and returned to everyone in the room). Then
 * delete this file; until then other members, the Dashboard tile, the chat's pinned plan and Couple
 * Mode don't see these amounts.
 */
import { useCallback, useSyncExternalStore } from 'react';
import type { IconName } from './icons';

export const CUSTOM_MAX = 10;
export const NAME_MAX = 24;
/** The small branded icon set offered when adding a category (all existing OTW inline icons). */
export const CUSTOM_ICONS: IconName[] = ['wallet', 'camera', 'heart', 'sparkle', 'map', 'bell', 'sun', 'image'];
export const DEFAULT_ICON: IconName = 'wallet';
const MAX_PESOS = 9_999_999.99;

/** The five server categories' names, so a custom one can't shadow them. */
const RESERVED = ['transportation', 'stay', 'food', 'activities', 'other'];

export interface CustomCategory {
  id: string;
  label: string;
  icon: IconName;
  /** Pesos, 2 dp. */
  amount: number;
  /** Colour slot, assigned once at creation so removing a category doesn't recolour the rest. */
  tone: number;
}

interface Stored {
  /** Next colour slot. */
  next: number;
  items: CustomCategory[];
}

const EMPTY_STORE: Stored = { next: 0, items: [] };
const key = (roomId: string) => `otw:budget-custom:${roomId}`;
const listeners = new Set<() => void>();

function raw(roomId: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(key(roomId)) ?? '';
  } catch {
    return '';
  }
}

const clampPesos = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.min(MAX_PESOS, Math.round(n * 100) / 100) : 0);

function parse(snapshot: string): Stored {
  if (!snapshot) return EMPTY_STORE;
  try {
    const v = JSON.parse(snapshot) as Partial<Stored> | null;
    if (!v || !Array.isArray(v.items)) return EMPTY_STORE;
    const items: CustomCategory[] = [];
    for (const it of v.items) {
      if (!it || typeof it.id !== 'string' || typeof it.label !== 'string' || !it.label.trim()) continue;
      items.push({
        id: it.id,
        label: it.label.slice(0, NAME_MAX),
        icon: CUSTOM_ICONS.includes(it.icon) ? it.icon : DEFAULT_ICON,
        amount: clampPesos(Number(it.amount)),
        tone: Number.isInteger(it.tone) && it.tone >= 0 ? it.tone : 0,
      });
    }
    return { next: Number.isInteger(v.next) && (v.next as number) >= items.length ? (v.next as number) : items.length, items: items.slice(0, CUSTOM_MAX) };
  } catch {
    return EMPTY_STORE;
  }
}

function write(roomId: string, next: Stored): boolean {
  try {
    window.localStorage.setItem(key(roomId), JSON.stringify(next));
  } catch {
    return false;
  }
  listeners.forEach((l) => l());
  return true;
}

/** null when the name is fine, else a friendly message. `others` = the other custom labels. */
export function nameError(label: string, others: string[]): string | null {
  const name = label.trim();
  if (!name) return 'Give it a name first.';
  if (name.length > NAME_MAX) return `Keep it under ${NAME_MAX} letters.`;
  const lower = name.toLowerCase();
  if (RESERVED.includes(lower) || others.some((o) => o.trim().toLowerCase() === lower)) {
    return 'May ganyan na. Pick another name.';
  }
  return null;
}

export type AddResult = { ok: true; item: CustomCategory } | { ok: false; error: string };

/** Adds a category (amount starts at 0). */
export function addCategory(roomId: string, label: string, icon: IconName): AddResult {
  const cur = parse(raw(roomId));
  if (cur.items.length >= CUSTOM_MAX) return { ok: false, error: `That's the max: ${CUSTOM_MAX} extra categories.` };
  const error = nameError(label, cur.items.map((c) => c.label));
  if (error) return { ok: false, error };
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `c${Date.now()}${cur.next}`;
  const item: CustomCategory = { id, label: label.trim(), icon, amount: 0, tone: cur.next };
  return write(roomId, { next: cur.next + 1, items: [...cur.items, item] })
    ? { ok: true, item }
    : { ok: false, error: "Couldn't save that on this device." };
}

/** Changes a category's name, icon or amount. Returns an error message, or null when it saved. */
export function updateCategory(
  roomId: string,
  id: string,
  patch: Partial<Pick<CustomCategory, 'label' | 'icon' | 'amount'>>
): string | null {
  const cur = parse(raw(roomId));
  const target = cur.items.find((c) => c.id === id);
  if (!target) return null;
  let label = target.label;
  if (patch.label !== undefined) {
    const error = nameError(patch.label, cur.items.filter((c) => c.id !== id).map((c) => c.label));
    if (error) return error;
    label = patch.label.trim();
  }
  const items = cur.items.map((c) =>
    c.id === id
      ? { ...c, label, icon: patch.icon ?? c.icon, amount: patch.amount !== undefined ? clampPesos(patch.amount) : c.amount }
      : c
  );
  return write(roomId, { ...cur, items }) ? null : "Couldn't save that on this device.";
}

export function removeCategory(roomId: string, id: string) {
  const cur = parse(raw(roomId));
  if (!cur.items.some((c) => c.id === id)) return;
  write(roomId, { ...cur, items: cur.items.filter((c) => c.id !== id) });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.storageArea === window.localStorage && cb();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
};

const NONE: CustomCategory[] = [];
let cache: { roomId: string; snapshot: string; value: CustomCategory[] } | null = null;

/** This room's custom categories on this device, in the order they were added; re-renders when they change. */
export function useCustomCategories(roomId: string | null): CustomCategory[] {
  const getSnapshot = useCallback((): CustomCategory[] => {
    if (!roomId) return NONE;
    const snapshot = raw(roomId);
    if (cache && cache.roomId === roomId && cache.snapshot === snapshot) return cache.value;
    const items = parse(snapshot).items;
    const value = items.length ? items : NONE;
    cache = { roomId, snapshot, value };
    return value;
  }, [roomId]);
  return useSyncExternalStore(subscribe, getSnapshot, () => NONE);
}
