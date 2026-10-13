/**
 * Members' saved looks (photo / colour / status), from GET /rooms/{id}/members/profiles: the gala store pushes
 * them in with `setMemberLooks`, and `useLook(userId)` (used by Avatar) reads them. Mobile counterpart of the
 * web's lib/otw/profile.ts (my own profile is edited on the Profile tab and comes back through the same list).
 */
import { useSyncExternalStore } from 'react';
import type { Tone } from './data';
import { driveThumb } from './drive';

export const NICKNAME_MAX = 20;
export const STATUS_MAX = 40;
export const TONES: Tone[] = ['rosy', 'teal', 'zest', 'blossom'];

const DRIVE_ID = /^[A-Za-z0-9_-]{1,200}$/;
const driveId = (v: unknown) => (typeof v === 'string' && DRIVE_ID.test(v) ? v : undefined);

/** Thumbnail URL for a profile photo's Drive file id (undefined when there is none). */
export const profilePhotoUrl = (fileId?: string | null) => (fileId ? driveThumb(fileId, 256) : undefined);

export interface MemberLook {
  /** Drive thumbnail URL of the profile photo. */
  photo?: string;
  tone?: Tone;
  status?: string;
}

interface ServerProfileWithId {
  userId: string;
  nickname: string;
  status: string;
  color: string | null;
  photoDriveFileId: string | null;
}

const NO_LOOKS: ReadonlyMap<string, MemberLook> = new Map();
let looks: ReadonlyMap<string, MemberLook> = NO_LOOKS;
const listeners = new Set<() => void>();

/** Replaces the known members' looks (an empty list or leaving the gala clears them). */
export function setMemberLooks(list: ServerProfileWithId[]) {
  const next = new Map<string, MemberLook>();
  for (const p of list) {
    next.set(p.userId, {
      photo: profilePhotoUrl(driveId(p.photoDriveFileId)),
      tone: TONES.includes(p.color as Tone) ? (p.color as Tone) : undefined,
      status: p.status || undefined,
    });
  }
  looks = next.size ? next : NO_LOOKS;
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Same as `useLook`, for plain code that is not a React component. */
export function lookOf(userId?: string | null): MemberLook | null {
  return userId ? (looks.get(userId) ?? null) : null;
}

/** Photo / colour / status for any member. Null when nothing was saved. */
export function useLook(userId?: string | null): MemberLook | null {
  const all = useSyncExternalStore(subscribe, () => looks);
  return userId ? (all.get(userId) ?? null) : null;
}
