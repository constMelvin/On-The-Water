'use client';

/**
 * Destination field for Plan a Gala: type to search places (suggestions from OpenStreetMap),
 * or "Pick on map" (shadcn Dialog with a click-to-pin map). Either way the text is what the
 * backend stores as `destination`; free text that matches nothing is fine too.
 */
import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState } from 'react';
import { MapPinIcon, MapIcon, LoaderCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MIN_QUERY, SEARCH_DEBOUNCE_MS, placeAt, searchPlaces, type Place } from '@/lib/otw/geocode';

const MapPicker = dynamic(() => import('./MapPicker'), {
  ssr: false,
  loading: () => <div className="h-[320px] w-full animate-pulse rounded-lg bg-muted" />,
});

export interface LocationPickerProps {
  value: string;
  onChange: (value: string, coords?: { lat: number; lng: number }) => void;
  maxLength?: number;
  placeholder?: string;
  /** Classes for the text input (so it matches the form's inputs). */
  inputClassName?: string;
  invalid?: boolean;
  id?: string;
}

export function LocationPicker({
  value,
  onChange,
  maxLength = 150,
  placeholder,
  inputClassName,
  invalid,
  id,
}: LocationPickerProps) {
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(-1);
  // Don't search again for the text a suggestion just filled in.
  const picked = useRef<string | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < MIN_QUERY || q === picked.current) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      searchPlaces(q, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(-1);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, SEARCH_DEBOUNCE_MS); // Nominatim asks for about one request a second at most.
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  const choose = (p: Place) => {
    picked.current = p.label;
    onChange(p.label, { lat: p.lat, lng: p.lng });
    setResults([]);
  };

  const showList = focused && (results.length > 0 || searching);

  /* ---------------- pick on map ---------------- */
  const [mapOpen, setMapOpen] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinPlace, setPinPlace] = useState<Place | null>(null);
  const [naming, setNaming] = useState(false);
  const [mapError, setMapError] = useState('');

  const onPin = (lat: number, lng: number) => {
    setPin({ lat, lng });
    setPinPlace(null);
    setMapError('');
    setNaming(true);
    placeAt(lat, lng)
      .then(setPinPlace)
      .catch((e: unknown) => setMapError(e instanceof Error ? e.message : "Couldn't name that spot."))
      .finally(() => setNaming(false));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <MapPinIcon
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 opacity-60"
          aria-hidden="true"
        />
        <input
          id={id}
          value={value}
          onChange={(e) => {
            picked.current = null;
            onChange(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          // Let a click on a suggestion land before the list closes.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (!results.length) return;
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
              setResults([]);
            }
          }}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={invalid || undefined}
          className={cn('pl-11', inputClassName)}
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute top-full right-0 left-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            {searching && !results.length ? (
              <li className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" /> Searching…
              </li>
            ) : (
              results.map((p, i) => (
                <li
                  key={`${p.lat},${p.lng},${i}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(p)}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded-md px-3 py-2 hover:bg-muted',
                    i === active && 'bg-muted'
                  )}
                >
                  <MapPinIcon className="mt-0.5 size-4 shrink-0 opacity-60" aria-hidden="true" />
                  <span>{p.label}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          setMapError('');
          setMapOpen(true);
        }}
      >
        <MapIcon className="mr-2 size-4" aria-hidden="true" /> Pick on map
      </Button>

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Saan ang gala?</DialogTitle>
            <DialogDescription>Tap the map to drop a pin. Zoom in for a specific spot.</DialogDescription>
          </DialogHeader>
          {mapOpen && <MapPicker pin={pin} onPick={onPin} />}
          <p className="min-h-5 text-sm" aria-live="polite">
            {naming ? 'Finding the place name…' : mapError ? mapError : pinPlace ? pinPlace.label : 'No pin yet.'}
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setMapOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!pinPlace}
              onClick={() => {
                if (!pinPlace) return;
                choose(pinPlace);
                setMapOpen(false);
              }}
            >
              Use this place
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
