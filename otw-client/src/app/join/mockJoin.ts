export interface GalaEvent {
  name: string;
  dateRange: string;
  location: string;
  attendeeCount: number;
  attendees: string[];
}

export type LookupGalaResult =
  | { ok: true; event: GalaEvent }
  | { ok: false; error: 'NOT_FOUND' };

export interface JoinGalaParams {
  code: string;
  nickname: string;
}

export type JoinGalaResult =
  | { ok: true }
  | { ok: false; error: 'NOT_FOUND' | 'INVALID_NICKNAME' };

/**
 * Looks up gala details by code.
 * Simulates ~600ms network latency.
 * OTW-0000 returns NOT_FOUND; validly-formatted codes return mock event data.
 */
export async function lookupGala(code: string): Promise<LookupGalaResult> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (code.toUpperCase() === 'OTW-0000') {
    return { ok: false, error: 'NOT_FOUND' };
  }

  return {
    ok: true,
    event: {
      name: 'Siargao Summer Escape 2026',
      dateRange: 'Oct 14 – 18, 2026',
      location: 'General Luna, Siargao',
      attendeeCount: 7,
      attendees: ['Bea', 'Miggy', 'Danica', 'Enzo', 'Camille', 'Paolo', 'Renz'],
    },
  };
}

/**
 * Submits the member nickname and joins the gala.
 * Simulates ~800ms network latency.
 */
export async function joinGala({
  code,
  nickname,
}: JoinGalaParams): Promise<JoinGalaResult> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (code.toUpperCase() === 'OTW-0000') {
    return { ok: false, error: 'NOT_FOUND' };
  }

  const trimmed = nickname.trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    return { ok: false, error: 'INVALID_NICKNAME' };
  }

  return { ok: true };
}