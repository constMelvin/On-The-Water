import { router, usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarStack } from '@/components/Avatar';
import { LockableScrollView } from '@/components/LockableScrollView';
import { Icon } from '@/components/Icon';
import { Tag } from '@/components/ui';
import { useGala } from '@/lib/otw/gala-store';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { GalaSheets } from './GalaSheets';
import { GBOT, PTABS, galaHref } from './nav';

/**
 * The gala shell at phone width (port of otw-client/src/components/gala/GalaShell.tsx below 640px): top bar
 * (home pin, More, title, role tag, who's going), the plan tab strip on plan pages, the screen, and the
 * three-button bottom nav (Home / Chat / Map). Screens scroll inside it (<GalaPage>).
 */
export function GalaShell({ children }: { children: ReactNode }) {
  const { gala, roomId, members, role, unread, openSheet } = useGala();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // /gala/[roomId]/[seg] -> seg ('' on the dashboard)
  const seg = pathname.split('/')[3] ?? '';
  const go = (s: string) => router.navigate(galaHref(roomId!, s) as Href);
  const showTabs = PTABS.some((t) => t.seg === seg);
  const going = members.filter((m) => m.s === 'g').map((m) => ({ name: m.n, userId: m.id, tone: m.c }));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.shell, { backgroundColor: colors.bgPage }]}>
      <View style={[styles.topbar, { backgroundColor: colors.surface, borderBottomColor: colors.line }]}>
        <View style={styles.tbl}>
          <Pressable accessibilityRole="button" accessibilityLabel="My Galas" onPress={() => router.navigate('/(tabs)')} style={styles.ibtn}>
            <Icon name="pin" size={24} color={brand.rosy} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={() => openSheet('more')} style={styles.ibtn}>
            <Icon name="more" size={24} color={colors.text} />
          </Pressable>
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
            {gala.title}
          </Text>
        </View>
        <View style={styles.tbr}>
          {role === 'leader' ? (
            <Tag variant="zest" icon="crown">
              Leader
            </Tag>
          ) : null}
          <AvatarStack people={going} size={30} max={3} />
        </View>
      </View>

      {showTabs ? (
        <View style={styles.ptabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ptabs}>
            {PTABS.map((t) => {
              const on = seg === t.seg;
              return (
                <Pressable
                  key={t.seg}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => go(t.seg)}
                  style={[styles.ptab, on ? styles.ptabOn : { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <Text style={[styles.ptabText, { color: on ? brand.cream : colors.text }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.main}>{children}</View>

      <View style={[styles.bnav, { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: 14 + insets.bottom }]}>
        {GBOT.map((d) => {
          const on = seg === d.seg;
          return (
            <Pressable key={d.seg} accessibilityRole="tab" accessibilityLabel={d.label} accessibilityState={{ selected: on }} onPress={() => go(d.seg)}>
              {({ pressed }) => (
                <View
                  style={[
                    styles.bn,
                    on ? styles.bnOn : { borderColor: colors.line, backgroundColor: colors.surface },
                    pressed && { transform: [{ translateY: 3 }] },
                  ]}>
                  <Icon name={d.icon} size={26} color={on ? brand.cream : brand.teal} />
                  {d.seg === 'chat' && seg !== 'chat' && unread > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <GalaSheets />
    </SafeAreaView>
  );
}

/**
 * Scrolling page body inside the shell (the web's <main class="main">). `overlay` (a FAB, a sheet) is drawn
 * above the scroller; `scroll={false}` gives a fixed body (chat, map).
 */
export function GalaPage({ children, scroll = true, overlay }: { children: ReactNode; scroll?: boolean; overlay?: ReactNode }) {
  return (
    <View style={styles.main}>
      {scroll ? (
        <LockableScrollView contentContainerStyle={[styles.pageInner, overlay ? styles.pageFab : null]} keyboardShouldPersistTaps="handled">
          {children}
        </LockableScrollView>
      ) : (
        <View style={styles.page}>{children}</View>
      )}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 3 },
  tbl: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 0 },
  tbr: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ibtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: font.displaySemi, fontSize: 19, marginLeft: 4 },
  ptabsWrap: { flexGrow: 0 },
  ptabs: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  ptab: { borderWidth: 3, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 14 },
  ptabOn: { backgroundColor: brand.teal, borderColor: brand.teal, borderBottomColor: brand.tealDark },
  ptabText: { fontFamily: font.bodyHeavy, fontSize: 14 },
  main: { flex: 1 },
  page: { flex: 1, padding: 16 },
  pageInner: { padding: 16, paddingBottom: 32, gap: 16 },
  pageFab: { paddingBottom: 110 },
  bnav: { flexDirection: 'row', justifyContent: 'center', gap: 26, paddingTop: 12, borderTopWidth: 3 },
  bn: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  bnOn: { backgroundColor: brand.teal, borderColor: brand.teal, borderBottomColor: brand.tealDark, borderBottomWidth: 6 },
  badge: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: brand.zest, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: font.bodyHeavy, fontSize: 12, color: brand.tealDark },
});
