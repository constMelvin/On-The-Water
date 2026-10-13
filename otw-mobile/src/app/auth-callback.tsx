import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Body, Button, Loading, Screen, Title } from '@/components/ui';
import { exchangeFromUrl } from '@/lib/auth';

/** otw://auth-callback?code=...: email confirm / password reset links that reopen the app. */
export default function AuthCallback() {
  const url = Linking.useLinkingURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    exchangeFromUrl(url)
      // A reset link signs in with a recovery session: set the new password first.
      .then((kind) => router.replace(kind === 'recovery' ? '/reset-password' : '/'))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'This link did not work.'));
  }, [url]);

  if (!error) return <Loading />;
  return (
    <Screen>
      <Title>Hala, expired na yata.</Title>
      <Body muted>{error} Log in again or ask for a new link.</Body>
      <Button label="Go to log in" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
