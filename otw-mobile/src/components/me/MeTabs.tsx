import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/** "My Galas | History" switch at the top of both pages (the web's MeShell tabs; Profile is its own bottom-nav tab). */
export function MeTabs({ active }: { active: 'galas' | 'history' }) {
  const { colors } = useTheme();
  const tab = (key: 'galas' | 'history', label: string, go: () => void) => {
    const on = active === key;
    return (
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={on ? undefined : go} style={[styles.tab, on && styles.on]}>
        <Text style={[styles.text, { color: on ? brand.cream : colors.text }]}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: colors.surface2 }]}>
      {tab('galas', 'My Galas', () => (router.canGoBack() ? router.back() : router.replace('/')))}
      {tab('history', 'History', () => router.push('/history'))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 999, padding: 4, gap: 2 },
  tab: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18 },
  on: { backgroundColor: brand.teal, borderBottomWidth: 3, borderBottomColor: brand.tealDark },
  text: { fontFamily: font.bodyHeavy, fontSize: 15 },
});
