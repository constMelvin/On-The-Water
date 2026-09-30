'use client';

import { accessToken } from './supabase';

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

/** Calls the OTW backend with the Supabase access token. Throws ApiError on failure. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let token: string;
  try {
    token = await accessToken();
  } catch (e) {
    throw new ApiError(0, 'AUTH_SETUP', e instanceof Error ? e.message : 'Could not start a session.');
  }

  let res: Response;
  try {
    res = await fetch(BASE + path, {
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

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.code ?? `HTTP_${res.status}`, data?.message ?? res.statusText);
  }
  return data as T;
}
