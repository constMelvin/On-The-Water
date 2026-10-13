import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { MapPicker } from './maps';
import { Field } from './ui';
import { MIN_QUERY, SEARCH_DEBOUNCE_MS, isAbort, placeAt, searchPlaces, type Place } from '@/lib/otw/geocode';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Place field with suggestions and an optional map (the web's LocationPicker): typing searches OpenStreetMap,
 * picking a suggestion (or tapping the map) sets the pin. Typing over the text drops the pin.
 */
export function LocationField({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 150,
  withMap = true,
  look,
}: {
  label: string;
  value: string;
  /** New text, and the pin when one was picked (undefined = no pin). */
  onChange: (value: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  maxLength?: number;
  withMap?: boolean;
  look?: 'teal' | 'line';
}) {
  const { colors } = useTheme();
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [problem, setProblem] = useState('');
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const picked = useRef<string | null>(value || null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < MIN_QUERY || q === picked.current) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      setProblem('');
      searchPlaces(q, ctrl.signal)
        .then((r) => {
          setResults(r);
          setProblem(r.length ? '' : "Hindi namin makita 'yan. Try another spelling.");
        })
        .catch((e: unknown) => {
          if (!isAbort(e)) setProblem('Walang connection sa place search. Type the place anyway.');
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  const choose = (p: Place) => {
    picked.current = p.label;
    setPin({ lat: p.lat, lng: p.lng });
    setResults([]);
    onChange(p.label, { lat: p.lat, lng: p.lng });
  };

  const onMap = (lat: number, lng: number) => {
    setPin({ lat, lng });
    onChange(value, { lat, lng });
    if (value.trim()) return;
    placeAt(lat, lng)
      .then((p) => {
        picked.current = p.label;
        onChange(p.label, { lat, lng });
      })
      .catch(() => undefined);
  };

  return (
    <View style={styles.wrap}>
      <Field
        label={label}
        look={look}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoCorrect={false}
        onChangeText={(v) => {
          picked.current = null;
          setPin(null);
          onChange(v, undefined);
        }}
      />
      {searching && !results.length ? <Text style={[styles.note, { color: colors.text }]}>Hinahanap…</Text> : null}
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
      {problem ? <Text style={[styles.note, { color: colors.rosyInk }]}>{problem}</Text> : null}
      {withMap ? (
        <>
          <Text accessibilityRole="button" onPress={() => setShowMap((v) => !v)} style={[styles.lnk, { color: colors.text }]}>
            {showMap ? 'Hide map' : 'Pick on map'}
          </Text>
          {showMap ? <MapPicker pin={pin} onPick={onMap} /> : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  list: { borderRadius: 18, paddingVertical: 4 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12 },
  optText: { flex: 1, fontFamily: font.bodyBold, fontSize: 14 },
  note: { fontFamily: font.bodyBold, fontSize: 13 },
  lnk: { fontFamily: font.bodyHeavy, fontSize: 14, textDecorationLine: 'underline', alignSelf: 'flex-start' },
});
