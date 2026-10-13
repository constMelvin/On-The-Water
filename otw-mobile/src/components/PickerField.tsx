import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { Button } from './ui';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');
/** Local date -> yyyy-mm-dd (no timezone shift). */
export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIsoDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toHhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fromHhmm = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const showDate = (iso: string) => fromIsoDate(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const showTime = (hhmm: string) => fromHhmm(hhmm).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * A date (yyyy-mm-dd) or time (hh:mm) field styled like the Plan inputs. Android opens the system dialog;
 * iOS shows the picker inline under the field with a Done button.
 */
export function PickerField({
  label,
  mode,
  value,
  onChange,
  placeholder,
  minimumDate,
  shadow,
  onSurface,
}: {
  label: string;
  mode: 'date' | 'time';
  /** yyyy-mm-dd or hh:mm; '' when not set. */
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minimumDate?: Date;
  shadow?: string;
  /** Inside a card or sheet (theme text label, teal border, line shadow) instead of on the rosy Plan page. */
  onSurface?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const [open, setOpen] = useState(false);
  const current = value ? (mode === 'date' ? fromIsoDate(value) : fromHhmm(value)) : (minimumDate ?? new Date());
  const shown = value ? (mode === 'date' ? showDate(value) : showTime(value)) : placeholder;

  return (
    <View style={styles.field}>
      <Text style={[styles.label, onSurface && { color: colors.text, fontSize: 15 }]}>{label}</Text>
      <View style={{ paddingBottom: 5 }}>
        <View style={[styles.shadow, { backgroundColor: shadow ?? (onSurface ? colors.line : brand.rosyDark) }]} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? shown : 'not set'}`}
          onPress={() => setOpen((o) => !o)}
          style={[styles.box, { backgroundColor: colors.fieldBg, borderColor: onSurface ? brand.teal : colors.fieldBg }]}>
          <Text style={[styles.value, { color: colors.text, opacity: value ? 1 : 0.55 }]}>{shown}</Text>
          {value ? (
            <Pressable accessibilityLabel={`Clear ${label}`} hitSlop={8} onPress={() => onChange('')}>
              <Icon name="x" size={18} color={colors.text} />
            </Pressable>
          ) : (
            <Icon name={mode === 'date' ? 'calendar' : 'clock'} size={20} color={colors.text} />
          )}
        </Pressable>
      </View>
      {open ? (
        <View style={Platform.OS === 'ios' ? [styles.ios, { backgroundColor: colors.surface }] : undefined}>
          <DateTimePicker
            value={current}
            mode={mode}
            minimumDate={mode === 'date' ? minimumDate : undefined}
            display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
            themeVariant={scheme}
            onValueChange={(_, d) => {
              onChange(mode === 'date' ? toIsoDate(d) : toHhmm(d));
              if (Platform.OS !== 'ios') setOpen(false);
            }}
            onDismiss={() => setOpen(false)}
          />
          {Platform.OS === 'ios' ? <Button sm variant="teal" label="Done" onPress={() => setOpen(false)} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8, flex: 1 },
  label: { fontFamily: font.bodyHeavy, fontSize: 16, color: brand.cream },
  shadow: { position: 'absolute', left: 0, right: 0, top: 5, bottom: 0, borderRadius: 18 },
  box: { borderWidth: 3, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  value: { flex: 1, fontFamily: font.bodyBold, fontSize: 17 },
  ios: { borderRadius: 18, padding: 10, gap: 8 },
});
