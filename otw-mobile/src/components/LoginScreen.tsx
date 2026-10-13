import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { Icon } from './Icon';
import { Button, ErrorNote, Field, Fine, Lnk, Screen } from './ui';
import { EXISTING_ACCOUNT_MESSAGE, resendConfirmation, signIn, signUp } from '@/lib/auth';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

export type AuthTab = 'login' | 'create';

/** What an account keeps for you, written into the planner card one line at a time. */
const PLANNER_ITEMS = ['Your saved galas', 'Personal gala calendar', 'Gala history', 'Your galas on any device'];
const PASSWORD_MIN = 8;
/** Seconds before "Resend email" works again (Supabase rate-limits confirmation emails). */
const RESEND_WAIT = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Log in / Create account with Supabase email + password (account required for everything).
 * Port of otw-client/src/app/login/LoginScreen.tsx. On success the auth gate in _layout opens My Galas.
 */
export function LoginScreen({ initialTab }: { initialTab: AuthTab }) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** Set after sign-up when the account still needs its email confirmed. */
  const [sentTo, setSentTo] = useState('');
  const [wait, setWait] = useState(0);
  const create = tab === 'create';

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const switchTab = (t: AuthTab) => {
    if (t === tab) return;
    setTab(t);
    setError('');
    // Email carries over; the password and the sign-up-only Name don't apply to the other form.
    setPassword('');
    if (t === 'login') setName('');
  };

  const submit = async () => {
    if (busy) return;
    if (create && !name.trim()) return setError('We need something to call you.');
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    if (create && password.length < PASSWORD_MIN) return setError(`Make it at least ${PASSWORD_MIN} characters.`);
    setError('');
    setBusy(true);
    try {
      if (create) {
        if ((await signUp(name, email, password)) === 'confirm-email') {
          setSentTo(email.trim());
          setWait(RESEND_WAIT);
        }
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTW couldn’t finish that just now. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy || wait > 0) return;
    setBusy(true);
    setError('');
    try {
      await resendConfirmation(sentTo);
      setWait(RESEND_WAIT);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTW couldn’t finish that just now. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setError('');
  };

  return (
    <Screen section="blossom" style={styles.page}>
      <View style={styles.backRow}>
        <Button sm fw={false} variant="cream" icon="back" label="Back to OTW" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
      {/* Log in / Create account switch */}
      <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: colors.surface }]}>
        {(['login', 'create'] as const).map((t) => {
          const on = tab === t;
          return (
            <Text
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => switchTab(t)}
              suppressHighlighting
              style={[styles.tab, on ? styles.tabOn : { color: colors.text, opacity: 0.55 }]}>
              {t === 'login' ? 'Log in' : 'Create account'}
            </Text>
          );
        })}
      </View>

      {sentTo ? (
        <View style={styles.sent} accessibilityLiveRegion="polite">
          <Animated.View entering={ZoomIn.springify()} style={styles.sentIconWrap}>
            <View style={[styles.sentIconShadow]} />
            <View style={[styles.sentIcon, { backgroundColor: colors.surface }]}>
              <Icon name="mail" size={44} color={brand.rosy} />
            </View>
          </Animated.View>
          <Text style={[styles.heading, { color: colors.secInk }]}>Check your email!</Text>
          <Text style={[styles.sub, { color: colors.secInk }]}>
            We sent a link to <Text style={{ color: colors.rosyInk }}>{sentTo}</Text>. Open it on this phone to confirm your
            account, then you’re in.
          </Text>
          <Fine style={[styles.center, { color: colors.secInk }]}>Not there? Check Spam or Promotions. It can take a minute.</Fine>
          <ErrorNote message={error} />
          <Button label={wait > 0 ? `Resend in ${wait}s` : 'Resend email'} icon="refresh" onPress={resend} disabled={busy || wait > 0} />
          <Lnk
            label="Already confirmed? Log in"
            color={colors.secInk}
            onPress={() => {
              setSentTo('');
              setPassword('');
              switchTab('login');
            }}
          />
        </View>
      ) : (
        <>
          <View style={styles.head}>
            <Text style={[styles.heading, { color: colors.secInk }]}>{create ? 'Create your OTW account.' : 'Welcome back.'}</Text>
            <Text style={[styles.sub, { color: colors.secInk }]}>
              {create ? 'Just once. Then let’s go.' : 'Your galas are right where you left them.'}
            </Text>
          </View>

          <View style={styles.form}>
            {create ? (
              <Field
                label="Name"
                value={name}
                onChangeText={edit(setName)}
                placeholder="What should the GC call you?"
                autoComplete="name"
                maxLength={40}
              />
            ) : null}
            <Field
              label="Email"
              value={email}
              onChangeText={edit(setEmail)}
              placeholder="you@email.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <Field
              label="Password"
              password
              value={password}
              onChangeText={edit(setPassword)}
              autoComplete={create ? 'new-password' : 'current-password'}
              hint={create ? 'At least 8 characters.' : undefined}
              onSubmitEditing={() => void submit()}
              returnKeyType="go"
            />
            {!create ? (
              <Lnk
                label="Forgot password?"
                color={colors.secInk}
                style={styles.forgot}
                onPress={() => router.push({ pathname: '/forgot-password', params: email.trim() ? { email: email.trim() } : {} })}
              />
            ) : null}

            <ErrorNote message={error}>
              {create && error === EXISTING_ACCOUNT_MESSAGE ? (
                <Text
                  onPress={() => {
                    setPassword('');
                    switchTab('login');
                  }}
                  style={styles.inlineLnk}>
                  {' '}
                  Log in
                </Text>
              ) : null}
            </ErrorNote>

            <Button label={create ? 'Create account' : 'Log in'} onPress={() => void submit()} busy={busy} />
            <Lnk
              label={create ? 'Already have an account? Log in' : 'New here? Create an account'}
              color={colors.secInk}
              onPress={() => switchTab(create ? 'login' : 'create')}
            />
            {create ? (
              <Fine style={[styles.center, { color: colors.secInk }]}>Just an email and a password. We won’t ask for your life story.</Fine>
            ) : null}
          </View>
        </>
      )}

      <Planner />
    </Screen>
  );
}

/** The planner card: paper, spiral rings, lines that write themselves and tick. */
function Planner() {
  const { colors } = useTheme();
  return (
    <View style={styles.plannerWrap} accessibilityLabel="What your account keeps for you">
      <View style={styles.plannerShadow} />
      <View style={[styles.planner, { backgroundColor: colors.surface }]}>
        <View style={styles.rings}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={styles.ring} />
          ))}
        </View>
        <View style={[styles.plannerHead, { borderBottomColor: colors.line }]}>
          <View style={styles.plannerIcon}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={brand.tealDark} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Rect x="4.5" y="4" width="15" height="17" rx="3" />
              <Path d="M9 2.5v3M15 2.5v3" />
              <Path d="M8.5 11h7M8.5 14.5h4" />
              <Path d="M14 17.8l1.6 1.6 3-3.2" />
            </Svg>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.plannerTitle, { color: colors.text }]}>Your gala planner</Text>
            <Text style={[styles.plannerSub, { color: colors.text }]}>One account. Everything in one place.</Text>
          </View>
        </View>
        {PLANNER_ITEMS.map((text, i) => (
          <Animated.View key={text} entering={FadeIn.delay(500 + i * 600).duration(500)} style={[styles.plannerRow, { borderBottomColor: colors.line }]}>
            <View style={styles.tick}>
              <Icon name="check" size={16} color={brand.cream} />
            </View>
            <Text style={[styles.plannerItem, { color: colors.text }]}>{text}</Text>
          </Animated.View>
        ))}
        <Animated.Text entering={FadeIn.delay(500 + PLANNER_ITEMS.length * 600).duration(500)} style={[styles.plannerNote, { color: colors.text }]}>
          One account, no matter how many galas you plan or join.
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { alignItems: 'center', paddingTop: 12, paddingBottom: 40, gap: 18 },
  backRow: { alignSelf: 'stretch' },
  center: { textAlign: 'center' },

  tabs: { flexDirection: 'row', gap: 4, padding: 5, borderRadius: 999 },
  tab: { minWidth: 132, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, overflow: 'hidden', textAlign: 'center', fontFamily: font.bodyHeavy, fontSize: 15 },
  tabOn: { backgroundColor: brand.teal, color: brand.cream, borderBottomWidth: 3, borderBottomColor: brand.tealDark },

  head: { gap: 8, alignItems: 'center' },
  heading: { fontFamily: font.displaySemi, fontSize: 34, lineHeight: 38, letterSpacing: -0.6, textAlign: 'center' },
  sub: { fontFamily: font.bodyBold, fontSize: 18, lineHeight: 25, textAlign: 'center' },
  form: { alignSelf: 'stretch', gap: 16 },
  inlineLnk: { textDecorationLine: 'underline' },
  forgot: { alignSelf: 'flex-end', fontSize: 15 },

  sent: { alignSelf: 'stretch', alignItems: 'center', gap: 14 },
  sentIconWrap: { paddingBottom: 6 },
  sentIconShadow: { position: 'absolute', left: 0, right: 0, top: 6, bottom: 0, backgroundColor: brand.rosyDark, borderTopLeftRadius: 44, borderTopRightRadius: 52, borderBottomRightRadius: 38, borderBottomLeftRadius: 58 },
  sentIcon: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 44, borderTopRightRadius: 52, borderBottomRightRadius: 38, borderBottomLeftRadius: 58 },

  plannerWrap: { alignSelf: 'stretch', marginTop: 18, paddingBottom: 6, transform: [{ rotate: '-1deg' }] },
  plannerShadow: { position: 'absolute', left: 0, right: 0, top: 6, bottom: 0, backgroundColor: brand.rosyDark, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 28, borderBottomLeftRadius: 14 },
  planner: { paddingTop: 34, paddingHorizontal: 22, paddingBottom: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 28, borderBottomLeftRadius: 14 },
  rings: { position: 'absolute', top: -10, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between' },
  ring: { width: 14, height: 26, borderRadius: 999, backgroundColor: brand.teal, borderWidth: 3, borderColor: brand.tealDark },
  plannerHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: 3 },
  plannerIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.zest, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: 8 },
  plannerTitle: { fontFamily: font.displaySemi, fontSize: 20, lineHeight: 22 },
  plannerSub: { fontFamily: font.bodyBold, fontSize: 13, opacity: 0.85 },
  plannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, borderBottomWidth: 2 },
  tick: { width: 24, height: 24, borderRadius: 8, borderWidth: 3, borderColor: brand.teal, backgroundColor: brand.teal, alignItems: 'center', justifyContent: 'center' },
  plannerItem: { fontFamily: font.bodyHeavy, fontSize: 16 },
  plannerNote: { marginTop: 12, fontFamily: font.bodyBold, fontSize: 14 },
});
