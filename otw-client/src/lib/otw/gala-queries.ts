'use client';

/**
 * React Query hooks for the gala tabs. Each list is one query under ['room', roomId, feature]
 * (see live.ts), kept fresh by the realtime channel or, while it's down, by polling.
 * Writes go straight to the backend; on success the cache gets the returned DTO and the
 * related queries (summary, settlement) are refetched. Nothing is stored on the device.
 */
import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query';
import { isApiError } from '@/lib/api/client';
import {
  getBudget,
  getChecklist,
  getCoupleIdeas,
  getExpenses,
  getItinerary,
  getLocations,
  getPhotos,
  getSettlement,
} from '@/lib/api/gala';
import type {
  BudgetVM,
  ChecklistItemVM,
  CoupleIdeaVM,
  ExpenseVM,
  ItineraryItemVM,
  MemberLocationVM,
  PhotoVM,
  SettlementVM,
} from '@/lib/api/types';
import { useGala, type ViewState } from './gala-store';
import { POLL_MS, featureKey, type GalaFeature } from './live';
import { toast } from './feedback';

const noRetryOn4xx = (n: number, e: Error) => !(isApiError(e) && e.status >= 400 && e.status < 500) && n < 2;

function useFeature<T>(feature: GalaFeature, fetcher: (roomId: string) => Promise<T>): UseQueryResult<T> {
  const { roomId, live } = useGala();
  return useQuery({
    queryKey: featureKey(roomId, feature),
    queryFn: () => fetcher(roomId!),
    enabled: !!roomId,
    retry: noRetryOn4xx,
    refetchInterval: live ? false : POLL_MS,
  });
}

export const useItinerary = () => useFeature<ItineraryItemVM[]>('itinerary', getItinerary);
export const useChecklist = () => useFeature<ChecklistItemVM[]>('checklist', getChecklist);
export const useBudget = () => useFeature<BudgetVM>('budget', getBudget);
export const useExpenses = () => useFeature<ExpenseVM[]>('expenses', getExpenses);
export const useSettlement = () => useFeature<SettlementVM>('settlement', getSettlement);
export const useLocations = () => useFeature<MemberLocationVM[]>('locations', getLocations);
export const usePhotos = () => useFeature<PhotoVM[]>('photos', (id) => getPhotos(id));
export const useCoupleIdeas = () => useFeature<CoupleIdeaVM[]>('couple', getCoupleIdeas);

/**
 * The screen state for a tab: the dev switcher wins; then this tab's own query (loading
 * until the first answer, error when it failed with nothing to show); then the gala's state
 * (offline bar while the connection is shaky).
 */
export function useTabState(...queries: { isPending: boolean; isError: boolean; data: unknown }[]): ViewState {
  const { viewState, liveState } = useGala();
  if (viewState !== 'default') return viewState;
  if (queries.some((q) => q.isError && q.data === undefined)) return 'error';
  if (queries.some((q) => q.isPending)) return 'loading';
  if (queries.some((q) => q.isError)) return 'offline';
  return liveState === 'loading' ? 'default' : liveState;
}

/** Puts a returned row into a cached list (replacing it by id, or appending it). */
export function upsertIn<T extends { id: string }>(qc: QueryClient, key: readonly unknown[], row: T): void {
  qc.setQueryData<T[]>(key, (rows) => {
    if (!rows) return rows;
    const i = rows.findIndex((r) => r.id === row.id);
    if (i < 0) return [...rows, row];
    const next = rows.slice();
    next[i] = row;
    return next;
  });
}

export function removeFrom<T extends { id: string }>(qc: QueryClient, key: readonly unknown[], id: string): void {
  qc.setQueryData<T[]>(key, (rows) => rows?.filter((r) => r.id !== id));
}

/**
 * Toasts why a write failed and refetches what it touched. A stale version (409) means
 * someone else changed it first: the refetch shows their change.
 */
export function failed(qc: QueryClient, keys: readonly (readonly unknown[])[], e: unknown, fallback: string): void {
  let msg = fallback;
  if (isApiError(e, 'OPTIMISTIC_LOCK_CONFLICT') || isApiError(e, 'ALREADY_CLAIMED')) {
    msg = 'Someone else just changed that. Showing the latest.';
  } else if (isApiError(e) && e.status >= 400 && e.status < 500 && e.message) {
    msg = e.message;
  } else if (isApiError(e, 'NETWORK')) {
    msg = "You're offline. Try again when you're back.";
  }
  toast(msg, 'err');
  keys.forEach((key) => void qc.invalidateQueries({ queryKey: key }));
}
