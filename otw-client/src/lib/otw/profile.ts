'use client';

/**
 * The person's own profile (photo, nickname, avatar colour, one-line status), kept on THIS device only,
 * per account: localStorage key `otw:profile:<supabase user id>`, so another account on the same device
 * never sees this one's photo. Reads and writes never throw; blocked or full storage just means the
 * profile isn't remembered.
 *
 * The backend (`GET/PUT /me/profile`) is the source of truth so the profile follows the account to other
 * devices; localStorage is the instant, offline-safe cache. On sign-in the server copy is pulled once (an empty
 * server profile uploads this device's copy instead); saving writes locally first, then pushes (`syncProfile`).
 * TODO(backend): other members still see only the initial; showing everyone's colour/photo needs the member
 * list to carry them (not built yet), so for now only my own avatar (Avatar's `userId` prop) uses them.
 */
import { useSyncExternalStore } from 'react';
import { api } from '@/lib/api/client';
import { supabase } from '@/lib/api/supabase';
import type { Tone } from './data';

export const NICKNAME_MAX = 20;
export const STATUS_MAX = 40;
export const TONES: Tone[] = ['rosy', 'teal', 'zest', 'blossom'];

export interface Profile {
  nickname: string;
  /** Set only once the person saved a colour; until then avatars keep their usual colours. */
  color?: Tone;
  /** One line ("Always late pero sumusipot"). */
  status: string;
  /** A small square JPEG/WebP data URL (see profile-photo.ts). */
  photo?: string;
}

interface Snapshot {
  /** undefined until the session has been read, null when signed out. */
  id: string | null | undefined;
  profile: Profile | null;
}

const key = (id: string) => `otw:profile:${id}`;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/* ---- who is signed in (module level, so Avatar needs no query client) ---- */

let authId: string | null | undefined;
let started = false;

function setAuthId(id: string | null) {
  if (authId === id) return;
  authId = id;
  notify();
  if (id) void pull(id);
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  try {
    const auth = supabase().auth;
    auth
      .getSession()
      .then(({ data }) => setAuthId(data.session?.user.id ?? null))
      .catch(() => setAuthId(null));
    auth.onAuthStateChange((_event, session) => setAuthId(session?.user.id ?? null));
  } catch {
    setAuthId(null);
  }
  // Another tab saved or cleared the profile.
  window.addEventListener('storage', (e) => e.storageArea === window.localStorage && notify());
}

/* ---- storage ---- */

function readRaw(id: string): string | null {
  try {
    return window.localStorage.getItem(key(id));
  } catch {
    return null;
  }
}

function parse(raw: string): Profile | null {
  try {
    const v = JSON.parse(raw) as Partial<Profile> | null;
    if (!v || typeof v !== 'object') return null;
    return {
      nickname: typeof v.nickname === 'string' ? v.nickname.slice(0, NICKNAME_MAX) : '',
      color: TONES.includes(v.color as Tone) ? v.color : undefined,
      status: typeof v.status === 'string' ? v.status.slice(0, STATUS_MAX) : '',
      photo: typeof v.photo === 'string' && v.photo.startsWith('data:image/') ? v.photo : undefined,
    };
  } catch {
    return null;
  }
}

const NONE: Snapshot = { id: undefined, profile: null };
let cached: { id: string | null; raw: string | null; snap: Snapshot } | null = null;

function getSnapshot(): Snapshot {
  const id = authId;
  if (id === undefined) return NONE;
  const raw = id ? readRaw(id) : null;
  if (cached && cached.id === id && cached.raw === raw) return cached.snap;
  const snap: Snapshot = { id, profile: raw ? parse(raw) : null };
  cached = { id, raw, snap };
  return snap;
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  start();
  return () => {
    listeners.delete(cb);
  };
};

/* ---- backend sync (best effort: the local copy always works) ---- */

interface ServerProfile {
  nickname: string;
  status: string;
  color: string | null;
  photo: string | null;
}

const pulled = new Set<string>();
/** Accounts saved on this device before their first pull finished (the pull must not overwrite those). */
const touched = new Set<string>();

function toServer(p: Profile): ServerProfile {
  return { nickname: p.nickname, status: p.status, color: p.color ?? null, photo: p.photo ?? null };
}

function writeLocal(id: string, p: Profile): boolean {
  try {
    window.localStorage.setItem(key(id), JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

/** Once per account per page load: adopt the server profile, or upload this device's one if the server has none. */
async function pull(id: string) {
  if (pulled.has(id)) return;
  pulled.add(id);
  try {
    const s = await api<ServerProfile>('/me/profile');
    if (authId !== id || touched.has(id)) return;
    const empty = !s.nickname && !s.status && !s.color && !s.photo;
    if (!empty) {
      const next: Profile = {
        nickname: s.nickname.slice(0, NICKNAME_MAX),
        status: s.status.slice(0, STATUS_MAX),
        color: TONES.includes(s.color as Tone) ? (s.color as Tone) : undefined,
        photo: s.photo && s.photo.startsWith('data:image/') ? s.photo : undefined,
      };
      if (writeLocal(id, next)) notify();
      return;
    }
    const raw = readRaw(id);
    const local = raw ? parse(raw) : null;
    if (local) await api('/me/profile', { method: 'PUT', body: toServer(local) });
  } catch {
    pulled.delete(id); // offline or backend down: try again on the next page load / sign-in
  }
}

/** Pushes the saved profile to the backend. Returns false when it could not (the local copy is kept regardless). */
export async function syncProfile(p: Profile): Promise<boolean> {
  if (!authId) return false;
  try {
    await api('/me/profile', { method: 'PUT', body: toServer(p) });
    return true;
  } catch {
    return false;
  }
}

/** Saves the profile for the signed-in account on this device. Returns false when there is no account or storage refused. */
export function saveProfile(p: Profile): boolean {
  const id = authId;
  if (!id) return false;
  const clean: Profile = {
    nickname: p.nickname.trim().slice(0, NICKNAME_MAX),
    color: p.color,
    status: p.status.trim().slice(0, STATUS_MAX),
    photo: p.photo,
  };
  touched.add(id);
  if (!writeLocal(id, clean)) return false;
  notify();
  return true;
}

/** The signed-in account's id and saved profile (null before one is saved). Re-renders when it changes. */
export function useProfile(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => NONE);
}

/** My photo / colour, when `userId` is me and I saved them; otherwise null (the caller's usual look). */
export function useMyLook(userId?: string | null): { photo?: string; tone?: Tone } | null {
  const snap = useSyncExternalStore(subscribe, getSnapshot, () => NONE);
  if (!userId || !snap.id || snap.id !== userId || !snap.profile) return null;
  return { photo: snap.profile.photo, tone: snap.profile.color };
}
