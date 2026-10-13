import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { Tone } from '@/lib/otw/data';
import { useLook } from '@/lib/otw/profile';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

export type { Tone };
export const TONES: Tone[] = ['rosy', 'teal', 'zest', 'blossom'];

/** Fill, ink and offset-shadow colour per tone (.c-* in otw.css). */
export const TONE_COLORS: Record<Tone, { bg: string; fg: string; sh: string }> = {
  rosy: { bg: brand.rosy, fg: brand.cream, sh: brand.rosyDark },
  teal: { bg: brand.teal, fg: brand.cream, sh: brand.tealDark },
  zest: { bg: brand.zest, fg: brand.tealDark, sh: brand.zestDark },
  blossom: { bg: brand.blossom, fg: brand.tealDark, sh: brand.rosy },
};

export const isTone = (v: unknown): v is Tone => TONES.includes(v as Tone);

/** Tone by name when nothing else is known (stable per name). */
export const toneByName = (name: string): Tone => TONES[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TONES.length];

/**
 * Coloured circle with the initial (or photo) and a 3px ring in the surface colour (.av). With `userId`, that
 * member's saved photo / colour (GET members/profiles) replaces the usual look.
 */
export function Avatar({
  name,
  tone,
  photo,
  size = 36,
  userId,
  online,
}: {
  name: string;
  tone?: Tone;
  photo?: string;
  size?: number;
  userId?: string | null;
  online?: boolean;
}) {
  const { colors } = useTheme();
  const look = useLook(userId);
  const t = TONE_COLORS[look?.tone ?? tone ?? toneByName(name || '?')];
  const img = photo ?? look?.photo;
  return (
    <View accessibilityLabel={name} style={{ width: size, height: size }}>
      <View style={[styles.av, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, borderColor: colors.surface }]}>
        {img ? (
          <Image source={{ uri: img }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} contentFit="cover" />
        ) : (
          <Text style={[styles.initial, { color: t.fg, fontSize: Math.round(size * 0.44) }]}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
        )}
      </View>
      {online ? <View style={[styles.dot, { borderColor: colors.surface }]} /> : null}
    </View>
  );
}

/** Overlapping avatars with a "+N" chip after `max`. */
export function AvatarStack({ people, size = 30, max = 4 }: { people: { name: string; userId?: string | null; tone?: Tone }[]; size?: number; max?: number }) {
  const { colors } = useTheme();
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <View style={styles.stack}>
      {shown.map((p, i) => (
        <View key={(p.userId ?? p.name) + i} style={{ marginLeft: i ? -10 : 0 }}>
          <Avatar name={p.name} userId={p.userId} tone={p.tone} size={size} />
        </View>
      ))}
      {more > 0 ? (
        <View style={[styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -10, backgroundColor: colors.surface2, borderColor: colors.surface }]}>
          <Text style={[styles.moreText, { color: colors.text }]}>+{more}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  av: { borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { fontFamily: font.displaySemi },
  dot: { position: 'absolute', right: -3, bottom: -3, width: 11, height: 11, borderRadius: 6, backgroundColor: brand.teal, borderWidth: 2 },
  stack: { flexDirection: 'row', alignItems: 'center' },
  more: { borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: font.bodyHeavy, fontSize: 11 },
});
