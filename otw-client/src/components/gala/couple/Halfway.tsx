'use client';

/**
 * Halfway Checker: each person saves a home, then the screen shows both on a map, the distance and the point
 * halfway between, with nearby date spots from OpenStreetMap. The midpoint is a starting point, not
 * necessarily the fairest place to meet. Homes are per gala and only the two of you can see them.
 */
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Icon, Sheet } from '@/components/otw';
import { toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey, roomKey } from '@/lib/otw/live';
import { failed, useCoupleHalfway } from '@/lib/otw/gala-queries';
import { MIN_QUERY, SEARCH_DEBOUNCE_MS, placeAt, searchPlaces, type Place } from '@/lib/otw/geocode';
import { useCalm } from '@/lib/otw/maplibre';
import { createStop, getSpots, saveHome, updateRoom } from '@/lib/api/gala';
import type { HalfwayVM, SpotCategory, SpotVM } from '@/lib/api/types';
import { ErrorState, Skeleton } from '../States';
import { useCanEditPlan } from '../route/Route';
import s from './halfway.module.css';

const HalfwayMap = dynamic(() => import('./HalfwayMap'), {
  ssr: false,
  loading: () => <div className={s.map} role="img" aria-label="Loading the map" />,
});

const CATEGORIES: { value: SpotCategory; label: string }[] = [
  { value: 'CAFE', label: 'Cafés' },
  { value: 'RESTAURANT', label: 'Restaurants' },
  { value: 'PARK', label: 'Parks' },
  { value: 'MALL', label: 'Malls' },
];

type Budget = 'any' | 1 | 2;
const BUDGETS: { value: Budget; label: string }[] = [
  { value: 'any', label: 'Any budget' },
  { value: 1, label: '₱ budget' },
  { value: 2, label: '₱₱ mid-range' },
];

const TIER_LABEL = ['Free', '₱', '₱₱'] as const;

export function Halfway() {
  const { roomId, role, memberRows, myUserId } = useGala();
  const qc = useQueryClient();
  const q = useCoupleHalfway();
  const canEditPlan = useCanEditPlan();
  const calm = useCalm();
  const key = featureKey(roomId, 'couple-halfway');

  const [setting, setSetting] = useState(false);
  const [category, setCategory] = useState<SpotCategory>('CAFE');
  const [budget, setBudget] = useState<Budget>('any');
  const [selected, setSelected] = useState<SpotVM | null>(null);

  const mid = q.data?.midpoint ?? null;
  const spotsQ = useQuery({
    queryKey: ['couple-spots', roomId, category, mid && mid.lat.toFixed(3), mid && mid.lng.toFixed(3)],
    queryFn: () => getSpots(roomId!, category),
    enabled: !!roomId && !!mid,
    staleTime: 30 * 60_000,
    retry: false,
  });

  if (q.isPending) return <Skeleton label="Loading Halfway Checker" />;
  if (!q.data) return <ErrorState kind="couple" onRetry={async () => (await q.refetch()).isSuccess} />;

  const data = q.data;
  const partnerName = memberRows.find((m) => m.userId !== myUserId)?.nickname ?? 'Your partner';
  const spots = (spotsQ.data?.spots ?? []).filter((p) => budget === 'any' || p.priceTier <= budget);
  const selectedIndex = selected ? spots.findIndex((p) => p.lat === selected.lat && p.lng === selected.lng) : -1;

  const saveMine = async (lat: number, lng: number, label: string) => {
    if (!roomId) return;
    const next = await saveHome(roomId, { lat, lng, label });
    qc.setQueryData<HalfwayVM>(key, next);
    setSetting(false);
    toast('Home saved.');
  };

  const addStop = (p: SpotVM) => {
    if (!roomId) return;
    createStop(roomId, {
      title: p.name,
      stopType: p.category === 'CAFE' || p.category === 'RESTAURANT' ? 'FOOD' : 'ACTIVITY',
      lat: p.lat,
      lng: p.lng,
    })
      .then(() => {
        void qc.invalidateQueries({ queryKey: featureKey(roomId, 'itinerary') });
        toast('Added to your plan.');
      })
      .catch((e: unknown) => failed(qc, [], e, "Couldn't add that stop."));
  };

  const meetHere = (p: SpotVM) => {
    if (!roomId) return;
    updateRoom(roomId, { meetingLat: p.lat, meetingLng: p.lng, meetingLabel: p.name })
      .then(() => {
        void qc.invalidateQueries({ queryKey: roomKey(roomId) });
        toast('Meeting point set.');
      })
      .catch((e: unknown) => failed(qc, [], e, "Couldn't set the meeting point."));
  };

  return (
    <div className={s.wrap}>
      <section className={s.homes} aria-label="Home locations">
        <div className={s.home}>
          <span className="ico sm" aria-hidden="true">
            <Icon name="home" size={20} />
          </span>
          <div className={s.homeText}>
            <b>Your home</b>
            <span>{data.mine ? data.mine.label || 'Saved' : 'Not set yet'}</span>
          </div>
          <Button sm variant={data.mine ? 'ghost' : 'rosy'} onClick={() => setSetting(true)}>
            {data.mine ? 'Change' : 'Set home'}
          </Button>
        </div>
        <div className={s.home}>
          <span className="ico sm" aria-hidden="true">
            <Icon name="user" size={20} />
          </span>
          <div className={s.homeText}>
            <b>{partnerName}</b>
            <span>{data.partner ? 'Home saved' : 'Not set yet'}</span>
          </div>
        </div>
      </section>

      <HalfwayMap
        mine={data.mine}
        partner={data.partner}
        midpoint={mid}
        spots={spots}
        selected={selectedIndex}
        onSelect={(i) => setSelected(spots[i] ?? null)}
        calm={calm}
      />

      {!data.mine || !data.partner ? (
        <p className="fine">
          {!data.mine ? 'Set your home to start.' : `Waiting for ${partnerName} to set their home.`} The halfway point shows up once you both have.
        </p>
      ) : (
        <>
          <section className={`${s.summary} bg-blossom`} aria-live="polite">
            <b className={s.big}>{data.distanceKm?.toFixed(1)} km apart</b>
            <span className="fine">
              The midpoint is a starting point, not always the fairest place to meet. Check travel time for each of you before you decide.
            </span>
          </section>

          <section aria-labelledby="halfway-spots">
            <h3 id="halfway-spots" className={s.h}>
              Date spots near the midpoint
            </h3>
            <div className={s.chips} role="group" aria-label="Spot type">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={category === c.value}
                  onClick={() => {
                    setCategory(c.value);
                    setSelected(null);
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className={s.chips} role="group" aria-label="Budget (rough estimate by place type)">
              {BUDGETS.map((b) => (
                <button key={String(b.value)} type="button" aria-pressed={budget === b.value} onClick={() => setBudget(b.value)}>
                  {b.label}
                </button>
              ))}
            </div>
            <p className="fine">Budget is a rough guess by place type. Real prices aren’t available.</p>

            {spotsQ.isPending ? (
              <Skeleton label="Finding date spots" />
            ) : spotsQ.isError ? (
              <ErrorState
                kind="couple"
                title="Couldn't load spots."
                body="Try again in a moment."
                onRetry={async () => (await spotsQ.refetch()).isSuccess}
              />
            ) : !spotsQ.data?.available ? (
              <p className={s.empty}>Spot suggestions are unavailable right now. Try again later.</p>
            ) : spots.length === 0 ? (
              <p className={s.empty}>No matches near the midpoint. Try another type or budget.</p>
            ) : (
              <ul className={s.spots}>
                {spots.map((p) => {
                  const on = selected?.lat === p.lat && selected?.lng === p.lng;
                  return (
                    <li key={`${p.lat},${p.lng},${p.name}`}>
                      <button type="button" className={`${s.spotBtn}${on ? ` ${s.spotBtnOn}` : ''}`} aria-pressed={on} onClick={() => setSelected(on ? null : p)}>
                        <b>{p.name}</b>
                        <span>
                          {p.distanceKm.toFixed(1)} km from the midpoint · {TIER_LABEL[p.priceTier]} est.
                        </span>
                      </button>
                      {on && (
                        <div className={s.actions}>
                          <Button sm variant="rosy" onClick={() => addStop(p)} disabled={!canEditPlan}>
                            <Icon name="plus" size={16} /> Add to plan
                          </Button>
                          <Button sm variant="teal" onClick={() => meetHere(p)} disabled={role !== 'leader'}>
                            <Icon name="flag" size={16} /> Set as meeting point
                          </Button>
                          {(!canEditPlan || role !== 'leader') && (
                            <span className="fine">
                              {!canEditPlan ? 'Plan editing is off for members.' : 'Only the Gala Leader sets the meeting point.'}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="fine">Map data © OpenStreetMap contributors.</p>
          </section>
        </>
      )}

      {setting && <HomeSheet onClose={() => setSetting(false)} onSave={saveMine} />}
    </div>
  );
}

/* ---------------- set my home: search a place, or use my device location (asks first) ---------------- */

function HomeSheet({ onClose, onSave }: { onClose: () => void; onSave: (lat: number, lng: number, label: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Too-short text shows no suggestions, whatever the last search returned.
  const shown = text.trim().length < MIN_QUERY ? [] : results;

  useEffect(() => {
    const t = text.trim();
    if (t.length < MIN_QUERY) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      searchPlaces(t, ctrl.signal)
        .then(setResults)
        .catch((e: unknown) => {
          if (!(e instanceof DOMException && e.name === 'AbortError')) setResults([]);
        })
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text]);

  const choose = async (lat: number, lng: number, label: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onSave(lat, lng, label.slice(0, 150));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't save that. Try again.");
      setBusy(false);
    }
  };

  const useDevice = () => {
    if (!navigator.geolocation) return setError('This device can’t share its location. Search for your place instead.');
    setError('');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let label = 'My location';
        try {
          label = (await placeAt(lat, lng)).label;
        } catch {
          /* the pin is enough; keep the generic label */
        }
        setBusy(false);
        await choose(lat, lng, label);
      },
      (err) => {
        setBusy(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location is blocked. Search for your place instead, or allow it in your browser settings.'
            : 'Couldn’t get your location. Search for your place instead.'
        );
      },
      { enableHighAccuracy: false, timeout: 10_000 }
    );
  };

  return (
    <Sheet title="Set your home" onClose={onClose}>
      <p className="fine">Only the two of you can see this. A nearby landmark or area works too.</p>
      <label className="fl">
        Search a place
        <input className="in" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Cubao, Quezon City" autoComplete="off" />
      </label>
      {searching && <p className="fine">Searching…</p>}
      {shown.length > 0 && (
        <ul className={s.results}>
          {shown.map((p) => (
            <li key={`${p.lat},${p.lng}`}>
              <button type="button" disabled={busy} onClick={() => choose(p.lat, p.lng, p.label)}>
                <Icon name="pin" size={18} /> {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button sm variant="ghost" onClick={useDevice} disabled={busy}>
          <Icon name="nav" size={16} /> Use my current location
        </Button>
        <p className="fine">Your browser will ask first. We only use it to save this pin.</p>
      </div>
      {error && (
        <p className="ferr" role="alert">
          <Icon name="alert" size={18} />
          {error}
        </p>
      )}
    </Sheet>
  );
}
