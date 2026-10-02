'use client';

import { NotSignedInError, accessToken, supabase } from './supabase';
import { isOnLoginPage, loginUrl } from '@/lib/auth/redirect';
import { signOut } from '@/lib/auth/session';

/** A backend error: `{ "code": "ROOM_NOT_FOUND", "message": "..." }` plus the HTTP status. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isApiError = (e: unknown, code?: string): e is ApiError =>
  e instanceof ApiError && (code === undefined || e.code === code);

const BASE = `${(process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080').replace(/\/+$/, '')}/api/v1`;

function goToLogin() {
  if (typeof window === 'undefined' || isOnLoginPage(window.location.pathname)) return;
  window.location.assign(loginUrl(window.location.pathname + window.location.search));
}

async function send(path: string, init: { method?: string; body?: unknown }, token: string): Promise<Response> {
  try {
    return await fetch(BASE + path, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', `Can't reach the OTW server at ${BASE}. Is the backend running?`);
  }
}

/** Calls the OTW backend with the Supabase access token. Throws ApiError on failure. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let token: string;
  try {
    token = await accessToken();
  } catch (e) {
    if (e instanceof NotSignedInError) {
      goToLogin();
      throw new ApiError(401, 'NOT_SIGNED_IN', e.message);
    }
    throw new ApiError(0, 'AUTH_SETUP', e instanceof Error ? e.message : 'Could not read your session.');
  }

  let res = await send(path, init, token);

  // Expired or revoked token: refresh once and retry; if that fails, sign out and go to /login.
  if (res.status === 401) {
    const peek = await res.clone().json().catch(() => null);
    if (peek?.code === 'UNAUTHENTICATED') {
      let refreshed: string | null = null;
      try {
        const { data, error } = await supabase().auth.refreshSession();
        if (!error && data.session) refreshed = data.session.access_token;
      } catch {
        // network failure while refreshing: treated as a failed refresh
      }
      if (refreshed) {
        res = await send(path, init, refreshed);
        if (res.status === 401) {
          // Still rejected after a fresh token: clear the session or /login would bounce straight back.
          const again = await res.clone().json().catch(() => null);
          if (again?.code === 'UNAUTHENTICATED') {
            await signOut().catch(() => undefined);
            goToLogin();
          }
        }
      } else {
        await signOut().catch(() => undefined);
        goToLogin();
      }
    }
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && (data?.code === 'ACCOUNT_REQUIRED' || data?.code === 'UNAUTHENTICATED')) goToLogin();
    throw new ApiError(res.status, data?.code ?? `HTTP_${res.status}`, data?.message ?? res.statusText);
  }
  return data as T;
}
