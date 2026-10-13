import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ErrorNote, Field, Screen } from '@/components/ui';
import { updatePassword } from '@/lib/auth';
import { toast } from '@/lib/otw/feedback';
import { font } from '@/theme/fonts';
import { useTheme } from '@/theme/ThemeProvider';

const PASSWORD_MIN = 8;

/**
 * Set a new password, reached from auth-callback after a reset link's recovery session. Lives
 * outside both auth guards in _layout: the recovery session already counts as signed in.
 */
export default function ResetPassword() {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (password.length < PASSWORD_MIN) return setError(`Make it at least ${PASSWORD_MIN} characters.`);
    if (password !== confirm) return setError('Those passwords don’t match.');
    setError('');
    setBusy(true);
    try {
      await updatePassword(password);
      toast('Password updated. You’re in.');
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTW couldn’t finish that just now. Try again in a moment.');
      setBusy(false);
    }
  };

  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    setError('');
  };

  return (
    <Screen section="blossom" style={styles.page}>
      <View style={styles.head}>
        <Text style={[styles.heading, { color: colors.secInk }]}>Set a new password.</Text>
        <Text style={[styles.sub, { color: colors.secInk }]}>Pick something you’ll remember this time.</Text>
      </View>
      <View style={styles.form}>
        <Field
          label="New password"
          password
          value={password}
          onChangeText={edit(setPassword)}
          autoComplete="new-password"
          hint="At least 8 characters."
          autoFocus
        />
        <Field
          label="Confirm new password"
          password
          value={confirm}
          onChangeText={edit(setConfirm)}
          autoComplete="new-password"
          onSubmitEditing={() => void submit()}
          returnKeyType="go"
        />
        <ErrorNote message={error} />
        <Button label="Save new password" onPress={() => void submit()} busy={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', paddingTop: 40, paddingBottom: 40, gap: 18 },
  head: { gap: 8, alignItems: 'center' },
  form: { alignSelf: 'stretch', gap: 16 },
  heading: { fontFamily: font.displaySemi, fontSize: 34, lineHeight: 38, letterSpacing: -0.6, textAlign: 'center' },
  sub: { fontFamily: font.bodyBold, fontSize: 18, lineHeight: 25, textAlign: 'center' },
});
