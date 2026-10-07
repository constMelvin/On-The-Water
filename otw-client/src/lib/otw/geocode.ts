'use client';

/**
 * Place search for Plan a Gala's destination and the itinerary's Add a Stop, via OpenStreetMap
 * Nominatim (free, no key). Usage policy: at most about one request a second, no bulk use, and an
 * identifying Referer (the browser sends our origin; see Referrer-Policy in next.config.ts).
 * So callers debounce (SEARCH_DEBOUNCE_MS, MIN_QUERY), and this module caches answers, shares
 * identical in-flight requests and spaces real network calls at least a second apart.
 * What the person types is sent to OpenStreetMap's servers.
 *
 * TODO(backend): move geocoding behind a server-side proxy (own User-Agent, shared cache, rate
 * limit) before real traffic; the public Nominatim is not meant for production load.
 */
const BASE = 'https://nominatim.openstreetmap.org';

/** How long callers wait after the last keystroke before searching. */
export const SEARCH_DEBOUNCE_MS = 700;
/** Shortest text worth searching for. */
export const MIN_QUERY = 3;

export interface Place {
  /** Short display name, e.g. "Baguio, Benguet, Philippines". */
  label: string;
  lat: number;
  lng: number;
  /** City / province, for captions ("Baguio"). */
  area?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string>;
}

/** "Burnham Park, Baguio, Benguet" instead of the full postal string. */
function shorten(r: NominatimResult): string {
  const a = r.address ?? {};
  const parts = [
    r.name,
    a.suburb ?? a.village ?? a.neighbourhood,
    a.city ?? a.town ?? a.municipality,
    a.state ?? a.province ?? a.region,
    a.country,
  ].filter((x, i, all): x is string => !!x && all.indexOf(x) === i);
  const text = parts.length >= 2 ? parts.join(', ') : r.display_name;
  return text.length > 150 ? text.slice(0, 147) + '…' : text;
}

const areaOf = (r: NominatimResult): string | undefined => {
  const a = r.address ?? {};
  return a.city ?? a.town ?? a.municipality ?? a.state ?? a.province ?? a.region ?? undefined;
};

const toPlace = (r: NominatimResult): Place => ({
  label: shorten(r),
  lat: Number(r.lat),
  lng: Number(r.lon),
  area: areaOf(r),
});

/* ---------------- politeness: spacing, cache, single-flight ---------------- */

const MIN_GAP_MS = 1100;
let nextSlot = 0;

/** Waits until at least MIN_GAP_MS after the previous real request. */
async function slot(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_GAP_MS;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

const CACHE_MAX = 60;
const cache = new Map<string, Place[]>();
const inflight = new Map<string, Promise<Place[]>>();

const abortError = () => new DOMException('Aborted', 'AbortError');

/** Lets one caller walk away (abort) without cancelling a request other callers share. */
function withSignal<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    signal.addEventListener('abort', () => reject(abortError()), { once: true });
    p.then(resolve, reject);
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  await slot();
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error("Couldn't search places right now.");
  return (await res.json()) as T;
}

async function runSearch(q: string): Promise<Place[]> {
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&limit=6&accept-language=en&countrycodes=ph&q=${encodeURIComponent(q)}`;
  let rows = await fetchJson<NominatimResult[]>(url);
  if (!rows.length) {
    // Nothing in the Philippines: try worldwide.
    try {
      rows = await fetchJson<NominatimResult[]>(url.replace('&countrycodes=ph', ''));
    } catch {
      rows = [];
    }
  }
  return rows.map(toPlace);
}

/** Up to 6 places matching `q`. Philippines first, but anywhere works. Cached per query. */
export function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  const key = q.trim().toLowerCase().replace(/\s+/g, ' ');
  const hit = cache.get(key);
  if (hit) return withSignal(Promise.resolve(hit), signal);

  let p = inflight.get(key);
  if (!p) {
    p = runSearch(q.trim())
      .then((places) => {
        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
        cache.set(key, places);
        return places;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return withSignal(p, signal);
}

/** The place name at a map point (for "Pick on map"). */
export async function placeAt(lat: number, lng: number): Promise<Place> {
  const url = `${BASE}/reverse?format=jsonv2&addressdetails=1&zoom=14&accept-language=en&lat=${lat}&lon=${lng}`;
  let r: (NominatimResult & { error?: string }) | null;
  try {
    r = await fetchJson<NominatimResult & { error?: string }>(url);
  } catch {
    r = null;
  }
  if (!r || r.error) throw new Error("Couldn't name that spot. Type it instead.");
  return { label: shorten(r), lat, lng, area: areaOf(r) };
}
