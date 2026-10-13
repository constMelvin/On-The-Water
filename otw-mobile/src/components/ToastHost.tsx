import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Icon } from './Icon';
import { useBurstId, useToast } from '@/lib/otw/feedback';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

const SPARK_COLORS = [brand.zest, brand.rosy, brand.cream, brand.teal, brand.zest, brand.rosy, brand.cream];

/** Draws the toast pill (bottom) and the sparkle burst (centre) from lib/otw/feedback. Mount once at the root. */
export function ToastHost() {
  const t = useToast();
  const burstId = useBurstId();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {burstId > 0 ? <Burst key={burstId} /> : null}
      {t ? (
        <Animated.View
          key={t.id}
          entering={FadeInDown.springify()}
          exiting={FadeOut}
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            { bottom: 96 + insets.bottom, backgroundColor: t.kind === 'err' ? colors.surface : brand.tealDark, borderColor: t.kind === 'err' ? brand.rosyDark : brand.tealDark },
          ]}>
          <Icon name={t.kind === 'err' ? 'alert' : 'check'} size={18} color={t.kind === 'err' ? colors.rosyInk : brand.cream} />
          <Text style={[styles.text, { color: t.kind === 'err' ? colors.rosyInk : brand.cream }]}>{t.message}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Spark({ color, tx, ty }: { color: string; tx: number; ty: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ translateX: tx * p.value }, { translateY: ty * p.value }, { scale: 0.4 + 0.7 * p.value }],
  }));
  return (
    <Animated.View style={[styles.spark, style]}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** 7 sparkles flying out from the middle of the screen, ~700 ms. */
function Burst() {
  // Random once per burst (lazy state, so it never re-rolls on a re-render).
  const [sparks] = useState(() =>
    SPARK_COLORS.map((color, i) => {
      const a = Math.random() * Math.PI * 2;
      const d = 60 + Math.random() * 70;
      return { key: i, color, tx: Math.cos(a) * d, ty: Math.sin(a) * d };
    }),
  );
  return (
    <View style={styles.burst}>
      {sparks.map((s) => (
        <Spark key={s.key} color={s.color} tx={s.tx} ty={s.ty} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', alignSelf: 'center', maxWidth: '90%', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 3, paddingVertical: 10, paddingHorizontal: 18 },
  text: { fontFamily: font.bodyHeavy, fontSize: 15, flexShrink: 1 },
  burst: { position: 'absolute', top: '50%', left: '50%' },
  spark: { position: 'absolute' },
});
