/**
 * Couple Mode mock slice. Owned by the couple lane: add actions below.
 * The idea catalog is fixed on the backend (CoupleIdea enum), so every room starts with
 * all six, none saved. The demo gala has two saved.
 * TODO(backend): GET /rooms/{roomId}/couple/ideas replaces this slice (PUT/DELETE .../couple/ideas/{key}).
 */
import { defineSlice } from './store';
import { mockUserId } from './members';
import type { CoupleIdeaKey, CoupleIdeaVM } from './types';

/** Mirrors otw-server couple/entity/CoupleIdea.java. */
const CATALOG: [CoupleIdeaKey, string, number, number][] = [
  ['SUNSET_AT_THE_PARK', 'Sunset at the park', 0, 2],
  ['COFFEE_CRAWL', 'Coffee crawl', 600, 3],
  ['PICNIC_WITH_A_PLAYLIST', 'Picnic with a playlist', 400, 2],
  ['NIGHT_MARKET_FOOD_TRIP', 'Night market food trip', 800, 3],
  ['MUSEUM_THEN_MERIENDA', 'Museum, then merienda', 700, 4],
  ['MOVIE_NIGHT_AT_HOME', 'Movie night at home', 250, 3],
];

const ideas = (saved: CoupleIdeaKey[] = []): CoupleIdeaVM[] =>
  CATALOG.map(([key, title, estimatedCost, durationHours]) => ({
    key,
    title,
    estimatedCost,
    durationHours,
    saved: saved.includes(key),
    savedBy: saved.includes(key) ? mockUserId('Merylle') : null,
  }));

export const couple = defineSlice<CoupleIdeaVM[]>({
  key: 'couple',
  version: 1,
  empty: () => ideas(),
  demo: () => ideas(['SUNSET_AT_THE_PARK', 'NIGHT_MARKET_FOOD_TRIP']),
});
