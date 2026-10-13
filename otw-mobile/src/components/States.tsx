/**
 * Screen states every gala tab shares: loading skeleton, empty, error, offline bar (port of
 * otw-client/src/components/gala/States.tsx, same EMPTY / ERR copy).
 */
import { router, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import type { IconName } from '@/lib/otw/icons';
import { toast } from '@/lib/otw/feedback';
import { Icon } from './Icon';
import { Button, IconBlob } from './ui';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

interface EmptyCopy {
  i: IconName;
  t: string;
  b: string;
  c: string;
  href?: Href;
}

export const EMPTY = {
  dashboard: { i: 'users', t: 'Just you so far.', b: 'Share the gala code and get your friends in.', c: 'Share Gala' },
  attendance: { i: 'users', t: 'No responses yet.', b: 'Ask the GC. Tap Share Gala to send the code again.', c: 'Share Gala' },
  itinerary: { i: 'pin', t: 'No stops yet. Saan tayo?', b: 'Add the places, activities, food stops, and everything in between.', c: 'Add a Stop' },
  checklist: { i: 'checklist', t: 'Nothing here yet. Pack smart.', b: 'Add the things someone always forgets, like the charger.', c: 'Add to Checklist' },
  budget: { i: 'calc', t: 'No estimates yet.', b: 'Start with transportation. Everything else follows.', c: 'Add an estimate' },
  expenses: { i: 'wallet', t: 'No expenses yet. Walang nag-abono. Pa.', b: 'When someone pays for something, log it here so nobody has to remember.', c: 'Add an expense' },
  chat: { i: 'chat', t: 'Quiet in here. Say something.', b: 'Start with a “G!” or ask who is bringing the speaker.', c: 'Say hi' },
  location: { i: 'nav', t: "Nobody's sharing yet.", b: 'When people start heading out, they can share live location here. Sharing is always opt-in.', c: 'Share my location' },
  dump: { i: 'image', t: 'No memories yet. Go make some.', b: 'Photos from the gala land here for everyone.', c: 'Add Photos' },
  couple: { i: 'flag', t: 'Nothing here yet.', b: 'Add things you want to do together.', c: 'Add item' },
  mygalas: { i: 'calendar', t: 'Nothing on the calendar yet.', b: 'Sounds like a good time to plan something.', c: 'Plan a Gala', href: '/create' },
  history: { i: 'notepad', t: "No past galas yet. Let's fix that.", b: 'Finished galas show up here with their photos and expenses.', c: 'Plan a Gala', href: '/create' },
  notifs: { i: 'bell', t: 'All caught up.', b: 'When there is something to know, it shows up here first.', c: 'Back to My Galas', href: '/' },
} satisfies Record<string, EmptyCopy>;

export const ERR = {
  dashboard: { t: "The dashboard didn't load.", b: 'Your gala is safe. Give it another try.' },
  attendance: { t: "Couldn't save your status.", b: 'Nothing changed. Tap your choice again.' },
  itinerary: { t: "The route didn't load.", b: 'Your stops are safe. Try again.' },
  checklist: { t: "Couldn't update the checklist.", b: 'Nothing was lost. Try again in a moment.' },
  budget: { t: "Couldn't save your estimate.", b: 'Your numbers are still on this screen. Try saving again.' },
  expenses: { t: "Couldn't load the expenses.", b: 'Nothing was changed. Try again.' },
  chat: { t: "Messages didn't load.", b: 'Your chat is still there. Try again.' },
  couple: { t: "Couldn't load your list.", b: 'Try again in a moment.' },
  settings: { t: "Couldn't save your changes.", b: 'Nothing changed. Try again.' },
  completed: { t: "The recap didn't load.", b: 'Everything is still saved. Try again.' },
  mygalas: { t: "Couldn't load your galas.", b: 'They are still saved to your account. Try again.' },
  history: { t: "History didn't load.", b: 'Try again in a moment.' },
  notifs: { t: 'Notifications are off.', b: 'Allow notifications for OTW in your phone settings, then come back and try again.' },
  profile: { t: "Couldn't save your profile.", b: 'Nothing changed. Try again.' },
} satisfies Record<string, { t: string; b: string }>;

export type EmptyKey = keyof typeof EMPTY;
export type ErrKey = keyof typeof ERR;
export type ScreenState = 'default' | 'loading' | 'empty' | 'error' | 'offline';

/** A pulsing placeholder block (.sk). */
export function Sk({ height, width = '100%', radius = 22 }: { height: number; width?: number | `${number}%`; radius?: number }) {
  const { colors } = useTheme();
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.45, { duration: 800 }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: colors.surface2 }, style]} />;
}

export function Skeleton({ variant = 'grid', label = 'Loading' }: { variant?: 'grid' | 'chat' | 'dump'; label?: string }) {
  return (
    <View style={styles.skl} accessibilityLabel={label} accessibilityState={{ busy: true }}>
      {variant === 'dump' ? (
        <>
          <Sk height={56} width="60%" />
          <View style={styles.masonry}>
            {[190, 250, 170, 280, 210, 240].map((h, i) => (
              <View key={i} style={styles.half}>
                <Sk height={h * 0.7} />
              </View>
            ))}
          </View>
        </>
      ) : variant === 'chat' ? (
        [70, 90, 60, 80, 64].map((h, i) => (
          <View key={i} style={{ alignItems: i % 2 ? 'flex-end' : 'flex-start' }}>
            <Sk height={h} width="56%" />
          </View>
        ))
      ) : (
        <>
          <Sk height={132} />
          {[1, 2, 3, 4].map((i) => (
            <Sk key={i} height={96} />
          ))}
        </>
      )}
    </View>
  );
}

export function Empty({ kind, onAction, title, body, cta }: { kind: EmptyKey; onAction?: () => void; title?: string; body?: string; cta?: string }) {
  const { colors } = useTheme();
  const e: EmptyCopy = EMPTY[kind];
  const go = onAction ?? (e.href ? () => router.push(e.href!) : () => toast('This opens the form.'));
  return (
    <View style={styles.empty}>
      <IconBlob name={e.i} index={2} size={96} iconSize={44} />
      <Text style={[styles.h3, { color: colors.text }]}>{title ?? e.t}</Text>
      <Text style={[styles.p, { color: colors.text }]}>{body ?? e.b}</Text>
      <Button fw={false} label={cta ?? e.c} onPress={go} />
    </View>
  );
}

export function ErrorState({ kind, onRetry, title, body }: { kind: ErrKey; onRetry?: () => boolean | void | Promise<boolean | void>; title?: string; body?: string }) {
  const { colors } = useTheme();
  const e = ERR[kind];
  const [busy, setBusy] = useState(false);
  const tryAgain = async () => {
    if (!onRetry) return;
    setBusy(true);
    try {
      const ok = await onRetry();
      if (ok === true) toast('Back in business.');
      else if (ok === false) toast("Still can't reach the server. Try again in a moment.", 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.empty} accessibilityRole="alert">
      <IconBlob name="alert" index={3} size={96} iconSize={44} color={brand.rosyDark} />
      <Text style={[styles.h3, { color: colors.text }]}>{title ?? e.t}</Text>
      <Text style={[styles.p, { color: colors.text }]}>{body ?? e.b}</Text>
      <Button fw={false} icon="refresh" label="Try again" onPress={() => void tryAgain()} busy={busy} />
    </View>
  );
}

/** The "Connection's a bit shaky." bar, above the (stale) screen. */
export function Offline() {
  return (
    <View style={styles.offl} accessibilityRole="alert">
      <Icon name="wifioff" size={22} color={brand.tealDark} />
      <Text style={styles.offlText}>
        <Text style={{ fontFamily: font.bodyHeavy }}>Connection&apos;s a bit shaky.</Text> You&apos;re seeing the last saved version. Anything you
        change will sync when you&apos;re back online.
      </Text>
    </View>
  );
}

/** loading -> Skeleton, empty -> Empty, error -> ErrorState, offline -> Offline bar + the screen. */
export function StateGate({
  state,
  kind,
  skeleton,
  onAction,
  onRetry,
  children,
}: {
  state: ScreenState;
  kind: EmptyKey | ErrKey;
  skeleton?: 'grid' | 'chat' | 'dump';
  onAction?: () => void;
  onRetry?: () => boolean | void | Promise<boolean | void>;
  children: ReactNode;
}) {
  if (state === 'loading') return <Skeleton variant={skeleton} />;
  if (state === 'empty' && kind in EMPTY) return <Empty kind={kind as EmptyKey} onAction={onAction} />;
  if (state === 'error' && kind in ERR) return <ErrorState kind={kind as ErrKey} onRetry={onRetry} />;
  return (
    <>
      {state === 'offline' ? <Offline /> : null}
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  skl: { gap: 14 },
  masonry: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  half: { width: '48%' },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 36, paddingHorizontal: 8 },
  h3: { fontFamily: font.displaySemi, fontSize: 22, textAlign: 'center' },
  p: { fontFamily: font.body, fontSize: 16, lineHeight: 22, textAlign: 'center', opacity: 0.9 },
  offl: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: brand.zest, borderRadius: 18, padding: 12 },
  offlText: { flex: 1, fontFamily: font.bodyBold, fontSize: 14, lineHeight: 20, color: brand.tealDark },
});
