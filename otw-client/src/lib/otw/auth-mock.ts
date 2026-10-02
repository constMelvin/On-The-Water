'use client';

/**
 * MOCK account state for the "an account is required to plan or join" model.
 * Frontend only: a flag in localStorage stands in for a signed-in user. Nothing here
 * talks to Supabase or the backend, so it is not real security.
 *
 * TODO(backend): require real auth here. Replace with the Supabase session
 * (signUp / signInWithPassword, then check `!user.is_anonymous`) and have the API
 * reject anonymous sessions on POST /rooms, /rooms/join and /rooms/enter.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'otw:signed-in';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/** Marks this device as signed in (mock). `name` is only kept for display. */
export function mockSignIn(name = '') {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ name, at: Date.now() }));
  } catch {
    /* storage blocked: the flag lasts until the page reloads */
    memory = true;
  }
  emit();
}

export function mockSignOut() {
  memory = false;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

let memory = false;

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
};

/**
 * true / false once known on the client; `undefined` during server render and
 * hydration so a guard never redirects before it has looked at localStorage.
 */
export function useSignedIn(): boolean | undefined {
  return useSyncExternalStore(
    subscribe,
    () => read() || memory,
    () => undefined
  );
}
