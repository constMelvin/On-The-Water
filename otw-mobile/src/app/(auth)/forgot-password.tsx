import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Button, ErrorNote, Field, Fine, Lnk, Screen } from '@/components/ui';
import { requestPasswordReset } from '@/lib/auth';
import { toast } from '@/lib/otw/feedback';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

/** Seconds before "Resend email" works again (Supabase rate-limits auth emails). */
const RESEND_WAIT = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Forgot password (port of otw-client/src/app/forgot-password). The link reopens the app at
 * auth-callback, which sends a recovery session on to /reset-password. The sent screen never says
 * whether the email has an account.
 */
export default function ForgotPassword() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (to: string) => {
    setBusy(true);
    setError('');
    try {
      await requestPasswordReset(to);
      setSentTo(to);
      setWait(RESEND_WAIT);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTW couldn’t finish that just now. Try again in a moment.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (busy) return;
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
    await send(email.trim());
  };

  const resend = async () => {
    if (busy || wait > 0) return;
    if (await send(sentTo)) toast('Sent again. Check your inbox.');
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  return (
    <Screen section="blossom" style={styles.page}>
      <View style={styles.backRow}>
        <Button sm fw={false} variant="cream" icon="back" label="Back to log in" onPress={back} />
      </View>

      {sentTo ? (
        <View style={styles.block} accessibilityLiveRegion="polite">
          <View style={[styles.icon, { backgroundColor: colors.surface }]}>
            <Icon name="mail" size={44} color={brand.rosy} />
          </View>
          <Text style={[styles.heading, { color: colors.secInk }]}>Check your email!</Text>
          <Text style={[styles.sub, { color: colors.secInk }]}>
            If <Text style={{ color: colors.rosyInk }}>{sentTo}</Text> has an OTW account, we sent it a link to set a new
            password. Open it on this phone.
          </Text>
          <Fine style={[styles.center, { color: colors.secInk }]}>Not there? Check Spam or Promotions. It can take a minute.</Fine>
          <ErrorNote message={error} />
          <Button label={wait > 0 ? `Resend in ${wait}s` : 'Resend email'} icon="refresh" onPress={resend} disabled={busy || wait > 0} />
          <Lnk label="Back to log in" color={colors.secInk} onPress={back} />
        </View>
      ) : (
        <>
          <View style={styles.block}>
            <Text style={[styles.heading, { color: colors.secInk }]}>Forgot your password?</Text>
            <Text style={[styles.sub, { color: colors.secInk }]}>Happens to the best of us. We’ll email you a link to set a new one.</Text>
          </View>
          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError('');
              }}
              placeholder="you@email.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onSubmitEditing={() => void submit()}
              returnKeyType="send"
              autoFocus
            />
            <ErrorNote message={error} />
            <Button label="Send reset link" onPress={() => void submit()} busy={busy} />
            <Lnk label="Remembered it? Log in" color={colors.secInk} onPress={back} />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', paddingTop: 12, paddingBottom: 40, gap: 18 },
  backRow: { alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  block: { alignSelf: 'stretch', alignItems: 'center', gap: 14 },
  form: { alignSelf: 'stretch', gap: 16 },
  heading: { fontFamily: font.displaySemi, fontSize: 34, lineHeight: 38, letterSpacing: -0.6, textAlign: 'center' },
  sub: { fontFamily: font.bodyBold, fontSize: 18, lineHeight: 25, textAlign: 'center' },
  icon: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 44, borderTopRightRadius: 52, borderBottomRightRadius: 38, borderBottomLeftRadius: 58 },
});
