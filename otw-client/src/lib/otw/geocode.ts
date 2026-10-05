'use client';

/**
 * Place search for Plan a Gala's destination, via OpenStreetMap Nominatim (free, no key).
 * Usage policy: at most about one request a second and no bulk use, so callers debounce.
 * What the person types is sent to OpenStreetMap's servers.
 */
const BASE = 'https://nominatim.openstreetmap.org';

export interface Place {
  /** Short display name, e.g. "Baguio, Benguet, Philippines". */
  label: string;
  lat: number;
  lng: number;
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

/** Up to 6 places matching `q`. Philippines first, but anywhere works. */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&limit=6&accept-language=en&countrycodes=ph&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error("Couldn't search places right now.");
  let rows = (await res.json()) as NominatimResult[];
  if (!rows.length) {
    // Nothing in the Philippines: try worldwide.
    const any = await fetch(url.replace('&countrycodes=ph', ''), { signal, headers: { Accept: 'application/json' } });
    rows = any.ok ? ((await any.json()) as NominatimResult[]) : [];
  }
  return rows.map((r) => ({ label: shorten(r), lat: Number(r.lat), lng: Number(r.lon) }));
}

/** The place name at a map point (for "Pick on map"). */
export async function placeAt(lat: number, lng: number): Promise<Place> {
  const res = await fetch(
    `${BASE}/reverse?format=jsonv2&addressdetails=1&zoom=14&accept-language=en&lat=${lat}&lon=${lng}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error("Couldn't name that spot. Type it instead.");
  const r = (await res.json()) as NominatimResult & { error?: string };
  if (r.error) throw new Error("Couldn't name that spot. Type it instead.");
  return { label: shorten(r), lat, lng };
}
