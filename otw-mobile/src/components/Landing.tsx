import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Icon, type IconName } from './Icon';
import { Button } from './ui';
import { burst } from '@/lib/otw/feedback';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/**
 * The landing page (port of otw-client/src/app/page.tsx at phone width), shown when signed out: hero (rosy), the
 * "Without OTW / With OTW" chat card, "Your gala starts here." road tracker (zest), the account cards (teal) and the
 * footer (teal-dark). Same copy as the web. Every action needs an account, so Plan / Join open Create account.
 */

/* ---------- drifting background shapes (the logo's sparkles, blobs, rings) ---------- */

type ShapeKind = 'spark' | 'blob' | 'ring' | 'burst';
function ShapeSvg({ k, size, color }: { k: ShapeKind; size: number; color: string }) {
  if (k === 'spark')
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill={color} />
      </Svg>
    );
  if (k === 'blob')
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M52 4C78 2 98 22 96 50c-2 30-24 48-50 46C20 94 2 74 5 48 8 24 28 6 52 4Z" fill={color} />
      </Svg>
    );
  if (k === 'ring')
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth={12} />
      </Svg>
    );
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50 4v18M50 78v18M4 50h18M78 50h18M17 17l13 13M70 70l13 13M83 17L70 30M30 70L17 83" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
    </Svg>
  );
}

function Drift({ k, size, color, opacity, left, top, dur }: { k: ShapeKind; size: number; color: string; opacity: number; left: `${number}%`; top: `${number}%`; dur: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, dur]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -12 * t.value }, { rotate: `${t.value * (k === 'spark' || k === 'burst' ? 40 : 8)}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left, top, opacity }, style]}>
      <ShapeSvg k={k} size={size} color={color} />
    </Animated.View>
  );
}

/* ---------- hero chat card: Without OTW vs With OTW ---------- */

type Msg = { t: 'msg'; w: number; text: string } | { t: 'gap'; text: string } | { t: 'link'; url: string };
const NAMES = ['Ana', 'Ben', 'Cai', 'Dani'];
const AV = [brand.rosy, brand.teal, brand.zest, brand.blossom];
const WITHOUT: Msg[] = [
  { t: 'msg', w: 0, text: 'G tayo sa Tagaytay?' },
  { t: 'msg', w: 1, text: 'G!! Kailan?' },
  { t: 'msg', w: 2, text: 'Weekend siguro' },
  { t: 'msg', w: 3, text: 'Sige sige, update na lang' },
  { t: 'gap', text: '3 weeks later...' },
  { t: 'msg', w: 0, text: 'Uy G pa ba tayo?' },
  { t: 'msg', w: 3, text: 'Next time na lang?' },
];
const WITH: Msg[] = [
  { t: 'msg', w: 0, text: 'G tayo sa Tagaytay?' },
  { t: 'msg', w: 1, text: 'G!! Kailan?' },
  { t: 'msg', w: 2, text: 'Weekend siguro' },
  { t: 'msg', w: 0, text: 'Gawa ko na sa OTW. Check niyo.' },
  { t: 'link', url: 'otw.app/g/7K2P' },
  { t: 'msg', w: 1, text: "I'm G!" },
  { t: 'msg', w: 3, text: 'Sama ako sa sasakyan ni Ana' },
];
const DWELL_MS = 5400;

function ConversationCard() {
  const [withOtw, setWithOtw] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setWithOtw((v) => !v), DWELL_MS);
    return () => clearInterval(t);
  }, []);
  const msgs = withOtw ? WITH : WITHOUT;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={withOtw ? 'With OTW. Tap to see without.' : 'Without OTW. Tap to see with.'} onPress={() => setWithOtw((v) => !v)}>
      <View style={styles.chatShadow} />
      <View style={styles.chat}>
        <View style={[styles.chatLabel, { backgroundColor: withOtw ? brand.teal : brand.rosyDark }]}>
          <Text style={styles.chatLabelText}>{withOtw ? 'With OTW' : 'Without OTW'}</Text>
        </View>
        <View key={withOtw ? 'with' : 'without'} style={styles.chatLog}>
          {msgs.map((m, i) => {
            const delay = 120 + i * 260;
            if (m.t === 'gap')
              return (
                <Animated.Text key={i} entering={FadeIn.delay(delay)} style={styles.gap}>
                  {m.text}
                </Animated.Text>
              );
            if (m.t === 'link')
              return (
                <Animated.View key={i} entering={FadeInDown.delay(delay)} style={styles.linkCard}>
                  <Icon name="pin" size={16} color={brand.rosy} />
                  <Text style={styles.linkText}>{m.url}</Text>
                </Animated.View>
              );
            const mine = m.w === 0;
            return (
              <Animated.View key={i} entering={FadeInDown.delay(delay)} style={[styles.msgRow, mine ? null : styles.msgRight]}>
                {mine ? (
                  <View style={[styles.av, { backgroundColor: AV[m.w] }]}>
                    <Text style={styles.avText}>{NAMES[m.w][0]}</Text>
                  </View>
                ) : null}
                <View style={[styles.bubble, mine ? styles.bubbleL : styles.bubbleR]}>
                  {!mine ? <Text style={styles.who}>{NAMES[m.w]}</Text> : null}
                  <Text style={[styles.bubbleText, { color: mine ? brand.tealDark : brand.cream }]}>{m.text}</Text>
                </View>
                {!mine ? (
                  <View style={[styles.av, { backgroundColor: AV[m.w] }]}>
                    <Text style={[styles.avText, { color: m.w >= 2 ? brand.tealDark : brand.cream }]}>{NAMES[m.w][0]}</Text>
                  </View>
                ) : null}
              </Animated.View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

/* ---------- how it works: the road tracker ---------- */

const STEPS: { t: string; d: string; icon: IconName }[] = [
  { t: 'Pick a date', d: 'Turn “someday” into a real date.', icon: 'calendar' },
  { t: 'See who’s G', d: 'I’m G, Maybe, or Can’t make it. No more “seen.”', icon: 'users' },
  { t: 'Build the plan', d: 'Add stops on a map, set the times, see the route.', icon: 'route' },
  { t: 'Talk gastos', d: 'Set the budget, log who paid, and see who owes whom.', icon: 'wallet' },
  { t: 'Pack smart', d: 'A shared checklist you can claim from. Someone always forgets the charger.', icon: 'checklist' },
  { t: 'Keep the GC going', d: 'Chat, react, and share photos without leaving the gala.', icon: 'chat' },
  { t: 'Watch everyone go OTW', d: 'Share your live location, because “OTW” needs proof.', icon: 'pin' },
];

function RoadTracker() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={styles.road}>
      <Text style={styles.trackStatus} accessibilityLiveRegion="polite">
        ● Stop {active + 1} of {STEPS.length} · {STEPS[active].t}
      </Text>
      {STEPS.map((s, i) => {
        const done = i < active;
        const here = i === active;
        return (
          <Pressable key={s.t} accessibilityRole="button" accessibilityLabel={`Stop ${i + 1}: ${s.t}`} onPress={() => setActive(i)} style={styles.stop}>
            <View style={styles.rail}>
              {i > 0 ? <View style={[styles.railLine, { backgroundColor: i <= active ? brand.rosy : 'rgba(31,99,118,0.25)' }]} /> : <View style={styles.railSpacer} />}
              <View style={[styles.milestone, done && { backgroundColor: brand.teal }, here && styles.milestoneHere]}>
                <Text style={[styles.milestoneText, { color: done || here ? brand.cream : brand.tealDark }]}>{i + 1}</Text>
              </View>
              {i < STEPS.length - 1 ? <View style={[styles.railLine, { backgroundColor: i < active ? brand.rosy : 'rgba(31,99,118,0.25)' }]} /> : <View style={styles.railSpacer} />}
            </View>
            <Animated.View layout={LinearTransition} style={[styles.stopCard, here && styles.stopCardHere]}>
              <View style={styles.stopIcon}>
                <Icon name={s.icon} size={22} color={brand.rosy} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.eyebrow}>Stop {String(i + 1).padStart(2, '0')}</Text>
                <Text style={styles.stopT}>{s.t}</Text>
                <Text style={styles.stopD}>{s.d}</Text>
              </View>
              {here ? (
                <View style={styles.van}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={brand.cream} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M3 16V9.5A2.5 2.5 0 0 1 5.5 7H14l4 4h1.5A1.5 1.5 0 0 1 21 12.5V16h-2M9 16h6M5 16H3M14 7v4h4" />
                    <Circle cx="7" cy="16.5" r="1.8" />
                    <Circle cx="17" cy="16.5" r="1.8" />
                  </Svg>
                  <Text style={styles.vanText}>OTW</Text>
                </View>
              ) : null}
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- features: one account fork ---------- */

const NOW_ITEMS = ['Plan or join a gala', 'Who’s G, a mapped itinerary, a shared checklist', 'Budget, ambagan, and group chat', 'Live location on gala day, if you share it', 'The Gala Dump for photos and videos'];
const LATER_ITEMS = ['Saved galas, one tap away', 'Your personal gala calendar', 'Gala history, including the mga drawing', 'Log in on any device and your galas are there'];

function ForkCard({ tag, title, sub, items, tone, bullet }: { tag: string; title: string; sub: string; items: string[]; tone: 'zest' | 'blossom'; bullet: 'check' | 'sparkle' }) {
  const bg = tone === 'zest' ? brand.zest : brand.blossom;
  const sh = tone === 'zest' ? brand.zestDark : brand.rosy;
  return (
    <View style={styles.forkWrap}>
      <View style={[styles.forkShadow, { backgroundColor: sh }]} />
      <View style={[styles.fork, { backgroundColor: bg }]}>
        <View style={styles.forkTag}>
          <Text style={styles.forkTagText}>{tag}</Text>
        </View>
        <Text style={styles.forkTitle}>{title}</Text>
        <Text style={styles.forkSub}>{sub}</Text>
        {items.map((t) => (
          <View key={t} style={styles.forkItem}>
            <View style={styles.bullet}>
              <Icon name={bullet} size={13} color={brand.cream} />
            </View>
            <Text style={styles.forkItemText}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ---------- page ---------- */

export function Landing() {
  const { colors } = useTheme();
  const toCreate = (delay = 0) => {
    burst();
    setTimeout(() => router.push('/signup'), delay);
  };
  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.flex, { backgroundColor: colors.secTdark }]}>
      <ScrollView>
        {/* hero */}
        <SafeAreaView edges={['top']} style={[styles.hero, { backgroundColor: colors.secRosy }]}>
          <Drift k="blob" size={240} color={brand.rosyDark} opacity={0.22} left="55%" top="55%" dur={9000} />
          <Drift k="ring" size={170} color={brand.rosyDark} opacity={0.24} left="-12%" top="-4%" dur={8000} />
          <Drift k="spark" size={90} color={brand.cream} opacity={0.16} left="78%" top="6%" dur={7000} />
          <Drift k="burst" size={90} color={brand.zest} opacity={0.24} left="4%" top="70%" dur={9500} />
          <Drift k="spark" size={26} color={brand.cream} opacity={0.55} left="30%" top="12%" dur={3400} />
          <View style={styles.nav}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.navLogin}>
              <Text style={styles.navLoginText}>Log in</Text>
            </Pressable>
            <Button sm fw={false} variant="zest" label="Create account" onPress={() => router.push('/signup')} />
          </View>
          <Animated.View entering={FadeInDown.springify()}>
            <Image source={require('../../assets/images/otw-logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="OTW" />
          </Animated.View>
          <View style={styles.badge}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill={brand.zestInk} />
            </Svg>
            <Text style={styles.badgeText}>For plans that actually happen</Text>
          </View>
          <Animated.Text entering={FadeInDown.delay(100)} style={styles.h1}>
            From &quot;G tayo?&quot;{'\n'}to &quot;OTW na.&quot;
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(250)} style={styles.lead}>
            No more fake “OTW.” Plan the gala, get everyone in, and actually go.
          </Animated.Text>
          <Animated.View entering={FadeInDown.delay(400)} style={styles.ctas}>
            <Button variant="zest" label="Plan a Gala" onPress={() => toCreate(450)} />
            <Pressable accessibilityRole="button" onPress={() => router.push('/signup')} style={styles.ghost}>
              <Text style={styles.ghostText}>Join a Gala →</Text>
            </Pressable>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(300)}>
            <ConversationCard />
          </Animated.View>
        </SafeAreaView>

        {/* how it works */}
        <View style={[styles.how, { backgroundColor: colors.secZest }]}>
          <Drift k="blob" size={220} color={brand.blossom} opacity={0.26} left="60%" top="2%" dur={9000} />
          <Drift k="ring" size={130} color={brand.zestDark} opacity={0.24} left="-8%" top="40%" dur={8000} />
          <Text style={[styles.h2, { color: colors.secInk }]}>Your gala starts here.</Text>
          <Text style={[styles.howSub, { color: colors.secInk }]}>Pick a date, get the group in, make it happen.</Text>
          <RoadTracker />
        </View>

        {/* features */}
        <View style={[styles.features, { backgroundColor: colors.secTeal }]}>
          <Drift k="spark" size={110} color={brand.zest} opacity={0.18} left="80%" top="2%" dur={9000} />
          <Drift k="burst" size={100} color={brand.blossom} opacity={0.22} left="2%" top="60%" dur={8500} />
          <ForkCard tag="One account for every gala." title="Create once. Gala anytime." sub="Sign up once, then plan or join any gala with it." items={NOW_ITEMS} tone="zest" bullet="check" />
          <View style={styles.or}>
            <Icon name="plus" size={18} color={brand.cream} />
            <Text style={styles.orText}>Plus</Text>
          </View>
          <ForkCard tag="Your galas, always with you." title="Never lose a gala again." sub="Upcoming plans and past galas, all in one place." items={LATER_ITEMS} tone="blossom" bullet="sparkle" />
        </View>

        {/* footer */}
        <SafeAreaView edges={['bottom']} style={[styles.footer, { backgroundColor: colors.secTdark }]}>
          <Image source={require('../../assets/images/otw-logo.png')} style={styles.footerLogo} contentFit="contain" accessibilityLabel="OTW logo" />
          <Text style={styles.footerP}>On The Water — because “someday” isn’t a plan.</Text>
          <Text style={styles.footerNote}>One free account. All your galas in one place.</Text>
          <View style={styles.footerLinks}>
            {[
              ['Plan a Gala', '/signup'],
              ['Join a Gala', '/signup'],
              ['Log in', '/login'],
              ['Privacy', '/privacy'],
            ].map(([label, href]) => (
              <Text key={label} accessibilityRole="link" onPress={() => router.push(href as '/login')} style={styles.footerLink}>
                {label}
              </Text>
            ))}
          </View>
        </SafeAreaView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 36, gap: 16, overflow: 'hidden' },
  nav: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingTop: 8 },
  navLogin: { paddingVertical: 8, paddingHorizontal: 6 },
  navLoginText: { fontFamily: font.bodyHeavy, fontSize: 15, color: brand.cream },
  logo: { width: '78%', aspectRatio: 1500 / 1027, alignSelf: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: brand.zest, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  badgeText: { fontFamily: font.bodyHeavy, fontSize: 13, color: brand.zestInk },
  h1: { fontFamily: font.display, fontSize: 44, lineHeight: 46, letterSpacing: -1, color: brand.cream },
  lead: { fontFamily: font.bodyBold, fontSize: 18, lineHeight: 25, color: brand.cream },
  ctas: { gap: 12 },
  ghost: { alignSelf: 'center', paddingVertical: 8 },
  ghostText: { fontFamily: font.displaySemi, fontSize: 18, color: brand.cream, textDecorationLine: 'underline' },

  chatShadow: { position: 'absolute', left: 0, right: 0, top: 8, bottom: -8, borderRadius: 28, backgroundColor: brand.rosyDark },
  chat: { backgroundColor: brand.cream, borderRadius: 28, padding: 14, gap: 10, minHeight: 380 },
  chatLabel: { alignSelf: 'center', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 14 },
  chatLabelText: { fontFamily: font.bodyHeavy, fontSize: 13, color: brand.cream },
  chatLog: { gap: 8 },
  gap: { fontFamily: font.bodyHeavy, fontSize: 12, color: brand.teal, textAlign: 'center', paddingVertical: 4 },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: brand.blossom, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, marginLeft: 36 },
  linkText: { fontFamily: font.bodyHeavy, fontSize: 13, color: brand.tealDark },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgRight: { justifyContent: 'flex-end' },
  av: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avText: { fontFamily: font.displaySemi, fontSize: 13, color: brand.cream },
  bubble: { maxWidth: '72%', borderRadius: 18, paddingVertical: 7, paddingHorizontal: 12 },
  bubbleL: { backgroundColor: brand.blossom, borderBottomLeftRadius: 5 },
  bubbleR: { backgroundColor: brand.teal, borderBottomRightRadius: 5 },
  who: { fontFamily: font.bodyHeavy, fontSize: 11, color: brand.zest },
  bubbleText: { fontFamily: font.bodyBold, fontSize: 14 },

  how: { paddingHorizontal: 20, paddingVertical: 40, gap: 10, overflow: 'hidden' },
  h2: { fontFamily: font.display, fontSize: 34, lineHeight: 38, textAlign: 'center' },
  howSub: { fontFamily: font.bodyBold, fontSize: 17, textAlign: 'center' },
  road: { marginTop: 10 },
  trackStatus: { fontFamily: font.bodyHeavy, fontSize: 14, color: brand.rosyDark, textAlign: 'center', marginBottom: 10 },
  stop: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  rail: { width: 40, alignItems: 'center' },
  railLine: { width: 6, flex: 1, borderRadius: 3 },
  railSpacer: { flex: 1 },
  milestone: { width: 36, height: 36, borderRadius: 18, backgroundColor: brand.cream, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: brand.tealDark },
  milestoneHere: { backgroundColor: brand.rosy, borderColor: brand.rosyDark, transform: [{ scale: 1.15 }] },
  milestoneText: { fontFamily: font.display, fontSize: 15 },
  stopCard: { flex: 1, flexDirection: 'row', gap: 10, backgroundColor: brand.cream, borderRadius: 22, padding: 12, marginVertical: 6, borderBottomWidth: 5, borderBottomColor: brand.zestDark, opacity: 0.85 },
  stopCardHere: { opacity: 1, borderBottomColor: brand.rosyDark },
  stopIcon: { width: 40, height: 40, borderRadius: 16, backgroundColor: brand.blossom, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: font.bodyHeavy, fontSize: 11, color: brand.rosy },
  stopT: { fontFamily: font.displaySemi, fontSize: 18, color: brand.tealDark },
  stopD: { fontFamily: font.bodyBold, fontSize: 13, lineHeight: 18, color: brand.tealDark },
  van: { position: 'absolute', right: -6, top: -10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: brand.rosy, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  vanText: { fontFamily: font.bodyHeavy, fontSize: 11, color: brand.cream },

  features: { paddingHorizontal: 20, paddingVertical: 40, gap: 14, overflow: 'hidden' },
  forkWrap: { paddingBottom: 8 },
  forkShadow: { position: 'absolute', left: 0, right: 0, top: 8, bottom: 0, borderRadius: 30 },
  fork: { borderRadius: 30, padding: 20, gap: 8 },
  forkTag: { alignSelf: 'flex-start', backgroundColor: brand.cream, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  forkTagText: { fontFamily: font.bodyHeavy, fontSize: 12, color: brand.tealDark },
  forkTitle: { fontFamily: font.display, fontSize: 26, color: brand.tealDark },
  forkSub: { fontFamily: font.bodyBold, fontSize: 15, color: brand.tealDark },
  forkItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 22, height: 22, borderRadius: 11, backgroundColor: brand.teal, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  forkItemText: { flex: 1, fontFamily: font.bodyHeavy, fontSize: 15, color: brand.tealDark },
  or: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6 },
  orText: { fontFamily: font.bodyHeavy, fontSize: 14, color: brand.cream },

  footer: { alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 36, paddingBottom: 24 },
  footerLogo: { width: 160, aspectRatio: 1500 / 1027 },
  footerP: { fontFamily: font.bodyBold, fontSize: 15, color: brand.cream, textAlign: 'center' },
  footerNote: { fontFamily: font.bodyBold, fontSize: 13, color: brand.cream, opacity: 0.8 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 8 },
  footerLink: { fontFamily: font.bodyHeavy, fontSize: 14, color: brand.zest },
});
