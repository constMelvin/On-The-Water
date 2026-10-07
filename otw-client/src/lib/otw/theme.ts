'use client';

/**
 * Light / dark theme. The choice lives in localStorage['otw:theme'] ('light' | 'dark'); no value means
 * "follow the OS". The attribute <html data-theme="light|dark"> is what the CSS reads (styles/tokens.css),
 * and it is set before first paint by the inline script in app/layout.tsx (THEME_INIT_SCRIPT), so there is
 * no flash. This module keeps it in sync afterwards. Never throws.
 */
import { useSyncExternalStore } from 'react';
import { THEME_KEY } from './theme-script';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function readChoice(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const resolve = (choice: ThemeChoice): ResolvedTheme => (choice === 'system' ? (prefersDark() ? 'dark' : 'light') : choice);

function apply(choice: ThemeChoice) {
  const theme = resolve(choice);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

/** A short colour crossfade right after a switch (never under reduced motion). */
function crossfade() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  root.classList.add('theme-anim');
  window.setTimeout(() => root.classList.remove('theme-anim'), 260);
}

/** Saves the choice and applies it right away. 'system' goes back to following the OS. */
export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === 'system') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* storage blocked: the theme still changes for this page view */
  }
  crossfade();
  apply(choice);
  notify();
}

let started = false;
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  // Another tab changed the choice, or the OS switched while we follow it.
  window.addEventListener('storage', (e) => {
    if (e.key !== THEME_KEY) return;
    apply(readChoice());
    notify();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readChoice() === 'system') {
      apply('system');
      notify();
    }
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  start();
  return () => {
    listeners.delete(cb);
  };
};

export interface ThemeState {
  choice: ThemeChoice;
  /** What is actually showing. */
  resolved: ResolvedTheme;
}

const SERVER: ThemeState = { choice: 'system', resolved: 'light' };
let cached: ThemeState = SERVER;

function getSnapshot(): ThemeState {
  const choice = readChoice();
  const resolved = (document.documentElement.dataset.theme as ResolvedTheme | undefined) ?? resolve(choice);
  if (cached.choice === choice && cached.resolved === resolved) return cached;
  cached = { choice, resolved };
  return cached;
}

/** The saved choice and the theme that is showing; re-renders when either changes. */
export function useTheme(): ThemeState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER);
}
