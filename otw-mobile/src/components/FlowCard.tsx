import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/** The big rounded card of the Join / Plan flows (.card + .cardTeal / .cardRosy: 10px solid shadow). */
export function FlowCard({ children, tone }: { children: ReactNode; tone: 'teal' | 'rosy' }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.shadow, { backgroundColor: tone === 'teal' ? brand.tealDark : brand.rosyDark }]} />
      <View style={[styles.card, { backgroundColor: colors.surface }]}>{children}</View>
    </View>
  );
}

/** Zest pill above a flow heading, with the sparkle mark (.badge). */
export function SparkleBadge({ children }: { children: string }) {
  return (
    <View style={styles.badge}>
      <Svg width={12} height={12} viewBox="0 0 24 24">
        <Path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill={brand.tealDark} />
      </Svg>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

/** Coloured name chips (.attendeeChip + .chipColor0-4). */
export function NameChips({ names }: { names: string[] }) {
  const { colors } = useTheme();
  const tones = [
    { bg: brand.zest, fg: brand.tealDark, sh: brand.zestDark },
    { bg: brand.teal, fg: brand.cream, sh: brand.tealDark },
    { bg: brand.rosy, fg: brand.cream, sh: brand.rosyDark },
    { bg: colors.surface, fg: colors.rosyInk, sh: brand.rosyDark },
    { bg: brand.tealDark, fg: brand.cream, sh: brand.teal },
  ];
  return (
    <View style={styles.chips}>
      {names.map((n, i) => {
        const t = tones[i % 5];
        return (
          <Text key={n} style={[styles.chip, { backgroundColor: t.bg, color: t.fg, borderBottomColor: t.sh }]}>
            {n}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', paddingBottom: 10 },
  shadow: { position: 'absolute', left: 0, right: 0, top: 10, bottom: 0, borderRadius: 32 },
  card: { borderRadius: 32, paddingVertical: 24, paddingHorizontal: 18, gap: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: brand.zest, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  badgeText: { fontFamily: font.bodyHeavy, fontSize: 11.5, letterSpacing: 0.5, color: brand.tealDark },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontFamily: font.bodyHeavy, fontSize: 12, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden', borderBottomWidth: 2 },
});
