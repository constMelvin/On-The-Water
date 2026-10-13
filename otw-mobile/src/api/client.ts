import { supabase } from '@/lib/supabase';
import { clearRooms } from '@/lib/rooms';

/** A backend error: `{ "code": "ROOM_NOT_FOUND", "message": "..." }` plus the HTTP status (0 = network). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isApiError = (e: unknown, code?: string): e is ApiError =>
  e instanceof ApiError && (code === undefined || e.code === code);

const BASE = `${(process.env.EXPO_PUBLIC_BACKEND_URL ?? '').replace(/\/+$/, '')}/api/v1`;

/** Codes that mean "this session is no good": sign out, and the auth gate in _layout shows login. */
const SIGN_OUT_CODES = new Set(['ACCOUNT_REQUIRED', 'UNAUTHENTICATED', 'TOKEN_INVALID', 'TOKEN_EXPIRED']);

type Init = { method?: string; body?: unknown };

async function send(path: string, init: Init, token: string): Promise<Response> {
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
    throw new ApiError(0, 'NETWORK', `Can't reach the OTW server at ${BASE}.`);
  }
}

async function codeOf(res: Response): Promise<string | undefined> {
  const body = (await res.clone().json().catch(() => null)) as { code?: string } | null;
  return body?.code;
}

/** Signs out and clears this device's code -> roomId cache (the auth gate clears the query cache). */
export async function signOut() {
  await clearRooms();
  await supabase.auth.signOut().catch(() => undefined);
}

/**
 * Calls the OTW backend with the Supabase access token. Throws ApiError on failure.
 * An expired token comes back as 401 UNAUTHENTICATED: refresh once, retry once, then sign out.
 */
export async function api<T>(path: string, init: Init = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, 'NOT_SIGNED_IN', 'Please log in to continue.');

  let res = await send(path, init, token);

  if (res.status === 401 && (await codeOf(res)) === 'UNAUTHENTICATED') {
    const refreshed = await supabase.auth.refreshSession().catch(() => null);
    const fresh = refreshed?.data.session?.access_token;
    if (fresh) res = await send(path, init, fresh);
  }

  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
  if (!res.ok) {
    const code = body?.code ?? `HTTP_${res.status}`;
    if (res.status === 401 && SIGN_OUT_CODES.has(code)) await signOut();
    throw new ApiError(res.status, code, body?.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}
