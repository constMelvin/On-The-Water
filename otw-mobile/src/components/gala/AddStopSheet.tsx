import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { MapPicker, type Landmark } from '@/components/maps';
import { PickerField } from '@/components/PickerField';
import { Sheet } from '@/components/Sheet';
import { Button, ChoiceChips, Field } from '@/components/ui';
import type { StopInput } from '@/lib/api/gala';
import type { StopType } from '@/lib/api/types';
import { addDays, daysBetween } from '@/lib/otw/gala-registry';
import { MIN_QUERY, SEARCH_DEBOUNCE_MS, isAbort, placeAt, searchPlaces, type Place } from '@/lib/otw/geocode';
import type { StopExtras } from '@/lib/otw/stop-extras';
import { manilaIso, splitManila } from '@/lib/otw/time';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * "Add a Stop" sheet (port of otw-client/src/components/gala/route/AddStopSheet.tsx): place (searchable, pinned on a
 * map), time, type (or a custom one kept on this phone), day on multi-day galas, notes.
 */
export const STOP_TYPES: { value: StopType; label: string }[] = [
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'FOOD', label: 'Food' },
  { value: 'MEET_UP', label: 'Meet-up' },
];
const CUSTOM = 'OTHER';
type TypeChoice = StopType | typeof CUSTOM;
const CUSTOM_MAX = 24;
const NO_MATCH = "Hindi namin makita 'yan. Try another spelling, or tap the map to drop a pin.";
const NO_CONNECTION = 'Walang connection sa place search. Type the place anyway, or tap the map.';

export interface StopInitial {
  title: string;
  stopType: StopType;
  customType?: string;
  startsAt: string | null;
  notes: string | null;
  lat?: number;
  lng?: number;
  area?: string;
}

export function AddStopSheet({
  startDate,
  days,
  title = 'Add a Stop',
  initial,
  onAdd,
  onClose,
  landmarks,
}: {
  startDate?: string;
  days: number;
  title?: string;
  initial?: StopInitial;
  onAdd: (stop: StopInput, extras?: StopExtras) => void | Promise<void>;
  onClose: () => void;
  landmarks?: Landmark[];
}) {
  const { colors } = useTheme();
  const when = initial?.startsAt ? splitManila(initial.startsAt) : null;
  const [place, setPlace] = useState(initial?.title ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number; area?: string } | null>(
    initial && initial.lat !== undefined && initial.lng !== undefined ? { lat: initial.lat, lng: initial.lng, area: initial.area } : null,
  );
  const [time, setTime] = useState(when?.time ?? '16:00');
  const [day, setDay] = useState(when && startDate ? Math.min(Math.max(0, daysBetween(startDate, when.date) - 1), Math.max(0, days - 1)) : 0);
  const [type, setType] = useState<TypeChoice>(initial?.customType ? CUSTOM : (initial?.stopType ?? 'ACTIVITY'));
  const [custom, setCustom] = useState(initial?.customType ?? '');
  const [note, setNote] = useState(initial?.notes ?? '');
  const [busy, setBusy] = useState(false);

  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [problem, setProblem] = useState<'' | 'empty' | 'error'>('');
  const [mapNote, setMapNote] = useState('');
  const picked = useRef<string | null>(initial?.title ?? null);

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
          setProblem(r.length ? '' : 'empty');
        })
        .catch((e: unknown) => {
          if (isAbort(e)) return;
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

  const submit = async () => {
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
          stopType: type === CUSTOM ? 'ACTIVITY' : type,
          notes: note.trim() || null,
          startsAt: startDate && time ? manilaIso(addDays(startDate, day), time) : null,
        },
        Object.keys(extras).length ? extras : undefined,
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
          <Button label={title} onPress={() => void submit()} busy={busy} />
          <Button variant="ghost" label="Cancel" onPress={onClose} />
        </>
      }>
      <Field
        label="Place"
        placeholder="Where are we going?"
        maxLength={150}
        value={place}
        onChangeText={(v) => {
          picked.current = null;
          setPlace(v);
          setCoords(null);
          setMapNote('');
        }}
        autoCorrect={false}
      />
      {searching && !results.length ? (
        <View style={styles.opt}>
          <Icon name="search" size={16} color={colors.text} />
          <Text style={[styles.optText, { color: colors.text }]}>Hinahanap…</Text>
        </View>
      ) : null}
      {results.length ? (
        <View style={[styles.list, { backgroundColor: colors.surface2 }]}>
          {results.map((p, i) => (
            <Pressable key={`${p.lat},${p.lng},${i}`} accessibilityRole="button" onPress={() => choose(p)} style={styles.opt}>
              <Icon name="pin" size={16} color={colors.text} />
              <Text style={[styles.optText, { color: colors.text }]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {problem ? <Text style={[styles.note, { color: colors.rosyInk }]}>{problem === 'empty' ? NO_MATCH : NO_CONNECTION}</Text> : null}

      <Text style={[styles.label, { color: colors.text }]}>Pin it on the map</Text>
      <MapPicker pin={coords ? { lat: coords.lat, lng: coords.lng } : null} onPick={onMapPick} landmarks={landmarks} />
      <Text style={[styles.note, { color: mapNote ? colors.rosyInk : colors.text }]}>
        {mapNote || (coords ? 'Pinned. Tap the map to move it.' : 'Search a place above, or tap the map to drop a pin.')}
      </Text>

      <PickerField onSurface label="Time" mode="time" value={time} placeholder="--:--" onChange={(v) => setTime(v || '16:00')} />
      <ChoiceChips
        label="Type"
        value={type}
        onChange={setType}
        options={[...STOP_TYPES, { value: CUSTOM as TypeChoice, label: 'Other / custom…' }] as { value: TypeChoice; label: string }[]}
      />
      {type === CUSTOM ? <Field label="What kind of stop?" placeholder="Photo walk, pasalubong run…" maxLength={CUSTOM_MAX} value={custom} onChangeText={setCustom} /> : null}
      {startDate && days > 1 ? (
        <ChoiceChips
          label="Day"
          value={String(day)}
          onChange={(v) => setDay(Number(v))}
          options={Array.from({ length: days }, (_, i) => ({ value: String(i), label: `Day ${i + 1}` }))}
        />
      ) : null}
      <Field label="Notes (optional)" placeholder="Anything people should know" maxLength={2000} value={note} onChangeText={setNote} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 18, paddingVertical: 4 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12 },
  optText: { flex: 1, fontFamily: font.bodyBold, fontSize: 14 },
  note: { fontFamily: font.bodyBold, fontSize: 13 },
  label: { fontFamily: font.bodyHeavy, fontSize: 15 },
});
