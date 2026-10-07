'use client';

import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { Button, Icon, Sheet } from '@/components/otw';
import { addDays, daysBetween } from '@/lib/otw/gala-registry';
import { MIN_QUERY, SEARCH_DEBOUNCE_MS, placeAt, searchPlaces, type Place } from '@/lib/otw/geocode';
import type { StopExtras } from '@/lib/otw/stop-extras';
import { manilaIso, splitManila } from '@/lib/otw/time';
import type { StopType } from '@/lib/api/types';
import type { StopInput } from '@/lib/api/gala';
import s from './AddStopSheet.module.css';

/** Leaflet needs `window`, so the map loads on the client only (same map as Plan a Gala's "Pick on map"). */
const MapPicker = dynamic(() => import('@/components/plan/MapPicker'), {
  ssr: false,
  loading: () => <div className={s.map} role="img" aria-label="Loading the map" />,
});

export const STOP_TYPES: { value: StopType; label: string }[] = [
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'FOOD', label: 'Food' },
  { value: 'MEET_UP', label: 'Meet-up' },
];

/** The select's "Other / custom…" choice. The server only knows the three StopTypes above. */
const CUSTOM = 'OTHER';
type TypeChoice = StopType | typeof CUSTOM;

const CUSTOM_MAX = 24;

const NO_MATCH = "Hindi namin makita 'yan. Try another spelling, or tap the map to drop a pin.";
const NO_CONNECTION = 'Walang connection sa place search. Type the place anyway, or tap the map.';

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const prefersCalm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A stop's current values, to open the sheet in edit mode. */
export interface StopInitial {
  title: string;
  stopType: StopType;
  /** The person's own type (kept on this device), when they typed one. */
  customType?: string;
  startsAt: string | null;
  notes: string | null;
  lat?: number;
  lng?: number;
  area?: string;
}

export interface AddStopSheetProps {
  /** Gala start (yyyy-mm-dd); a stop's time is on one of the gala's days. */
  startDate?: string;
  days: number;
  /** Sheet title + button label ("Add a Stop", "Add a place" in Couple Mode, "Save changes" when editing). */
  title?: string;
  /** Pre-fills the form (edit mode). Leave out to add a new stop. */
  initial?: StopInitial;
  /**
   * Called with the form's values (to add, or to save when `initial` is set). `extras` (map pin,
   * custom type) is optional: a caller that ignores it still gets a normal stop.
   * TODO(backend): send lat/lng and a free-text type in `stop` once the itinerary DTO has them.
   */
  onAdd: (stop: StopInput, extras?: StopExtras) => void | Promise<void>;
  onClose: () => void;
}

/** "Add a Stop" sheet (reference sheet addStop): place (searchable, pinned on a map), time, type, notes. Multi-day galas also pick the day. */
export function AddStopSheet({ startDate, days, title = 'Add a Stop', initial, onAdd, onClose }: AddStopSheetProps) {
  const when = initial?.startsAt ? splitManila(initial.startsAt) : null;
  const [place, setPlace] = useState(initial?.title ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number; area?: string } | null>(
    initial && initial.lat !== undefined && initial.lng !== undefined
      ? { lat: initial.lat, lng: initial.lng, area: initial.area }
      : null
  );
  const [time, setTime] = useState(when?.time ?? '16:00');
  const [day, setDay] = useState(
    when && startDate ? Math.min(Math.max(0, daysBetween(startDate, when.date) - 1), Math.max(0, days - 1)) : 0
  );
  const [type, setType] = useState<TypeChoice>(initial?.customType ? CUSTOM : (initial?.stopType ?? 'ACTIVITY'));
  const [custom, setCustom] = useState(initial?.customType ?? '');
  const [note, setNote] = useState(initial?.notes ?? '');
  const [busy, setBusy] = useState(false);

  /* ---------------- place search ---------------- */
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [problem, setProblem] = useState<'' | 'empty' | 'error'>('');
  const [active, setActive] = useState(-1);
  const [mapNote, setMapNote] = useState('');
  // Don't search again for the text a suggestion (or the map) just filled in.
  const picked = useRef<string | null>(initial?.title ?? null);
  const calm = useSyncExternalStore(subscribeMotion, prefersCalm, () => false);

  useEffect(() => {
    const q = place.trim();
    if (q.length < MIN_QUERY || q === picked.current) {
      setResults([]);
      setSearching(false);
      setProblem('');
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      setProblem('');
      searchPlaces(q, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(-1);
          setProblem(r.length ? '' : 'empty');
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          setResults([]);
          setProblem('error');
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [place]);

  const choose = (p: Place) => {
    picked.current = p.label;
    setPlace(p.label);
    setCoords({ lat: p.lat, lng: p.lng, area: p.area });
    setResults([]);
    setProblem('');
    setMapNote('');
  };

  /** Tapping the map moves the pin; with no place typed yet, the spot's name fills in. */
  const onMapPick = (lat: number, lng: number) => {
    setCoords({ lat, lng });
    setMapNote('');
    if (place.trim()) return;
    placeAt(lat, lng)
      .then((p) => {
        picked.current = p.label;
        setPlace(p.label);
        setCoords({ lat, lng, area: p.area });
      })
      .catch((e: unknown) => setMapNote(e instanceof Error ? e.message : "Couldn't name that spot. Type it instead."));
  };

  const showList = focused && (results.length > 0 || searching);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const customType = type === CUSTOM ? custom.trim() : '';
      const extras: StopExtras = {};
      if (coords) {
        extras.lat = coords.lat;
        extras.lng = coords.lng;
        if (coords.area) extras.area = coords.area;
      }
      if (customType) extras.customType = customType;
      await onAdd(
        {
          title: place.trim() || 'New stop',
          // The server only stores the three presets; a custom type is kept on this device.
          stopType: type === CUSTOM ? 'ACTIVITY' : type,
          notes: note.trim() || null,
          startsAt: startDate && time ? manilaIso(addDays(startDate, day), time) : null,
        },
        Object.keys(extras).length ? extras : undefined
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {title}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} style={{ display: 'contents' }}>
        <div className="fl">
          <label htmlFor={`${listId}-place`}>Place</label>
          <div className={s.combo}>
            <input
              id={`${listId}-place`}
              className="in"
              placeholder="Where are we going?"
              maxLength={150}
              value={place}
              onChange={(e) => {
                picked.current = null;
                setPlace(e.target.value);
                setCoords(null);
                setMapNote('');
              }}
              onFocus={() => setFocused(true)}
              // Let a click on a suggestion land before the list closes.
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              onKeyDown={(e) => {
                if (!showList || !results.length) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((i) => (i + 1) % results.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
                } else if (e.key === 'Enter' && active >= 0) {
                  e.preventDefault();
                  choose(results[active]);
                } else if (e.key === 'Escape') {
                  // Close the suggestions, not the whole sheet.
                  e.stopPropagation();
                  setResults([]);
                }
              }}
              autoComplete="off"
              role="combobox"
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            />
            {showList && (
              <ul id={listId} role="listbox" className={s.list}>
                {searching && !results.length ? (
                  <li className={s.busy}>
                    <Icon name="search" size={16} /> Hinahanap…
                  </li>
                ) : (
                  results.map((p, i) => (
                    <li
                      key={`${p.lat},${p.lng},${i}`}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      className={`${s.opt} ${i === active ? s.on : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(p)}
                    >
                      <Icon name="pin" size={16} />
                      <span>{p.label}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <p className={`${s.note} ${problem ? s.err : ''}`} aria-live="polite">
            {problem === 'empty' ? NO_MATCH : problem === 'error' ? NO_CONNECTION : ''}
          </p>
        </div>

        <div className="fl">
          <span>Pin it on the map</span>
          <MapPicker
            pin={coords ? { lat: coords.lat, lng: coords.lng } : null}
            onPick={onMapPick}
            className={s.map}
            scrollWheelZoom={false}
            calm={calm}
          />
          <p className={`${s.note} ${mapNote ? s.err : ''}`} aria-live="polite">
            {mapNote || (coords ? 'Pinned. Tap the map to move it.' : 'Search a place above, or tap the map to drop a pin.')}
          </p>
        </div>

        <div className={`two-in ${s.pair}`}>
          <label className="fl">
            Time
            <input className="in" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="fl">
            Type
            <select className="in" value={type} onChange={(e) => setType(e.target.value as TypeChoice)}>
              {STOP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
              <option value={CUSTOM}>Other / custom…</option>
            </select>
          </label>
        </div>
        {type === CUSTOM && (
          <label className="fl">
            What kind of stop?
            <input
              className="in"
              placeholder="Photo walk, pasalubong run…"
              maxLength={CUSTOM_MAX}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </label>
        )}
        {startDate && days > 1 && (
          <label className="fl">
            Day
            <select className="in" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {Array.from({ length: days }, (_, i) => (
                <option key={i} value={i}>
                  Day {i + 1}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="fl">
          Notes (optional)
          <input
            className="in"
            placeholder="Anything people should know"
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </form>
    </Sheet>
  );
}
