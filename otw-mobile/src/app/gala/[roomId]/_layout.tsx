import { Redirect, router, Slot, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { GalaShell } from '@/components/gala/GalaShell';
import { Button, IconBlob, PageHead, Screen } from '@/components/ui';
import { GalaProvider, useGala } from '@/lib/otw/gala-store';
import { brand } from '@/theme/tokens';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Every gala screen: the gala state (GalaProvider: room, members, summary, realtime on room:{roomId}) and the
 * shell, gated like the web's GalaGate (not found / not a member / error).
 */
export default function GalaLayout() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  // otw://gala/OTW-XXXX-XXXX (the web link shape) carries a code, not a room id.
  if (!UUID.test(roomId ?? '')) return <Redirect href={{ pathname: '/gala/open/[code]', params: { code: roomId ?? '' } }} />;
  return (
    <GalaProvider roomId={roomId}>
      <GalaGate />
    </GalaProvider>
  );
}

function GalaGate() {
  const { status, error, retry } = useGala();

  useEffect(() => {
    if (status === 'guest') router.replace('/(tabs)');
  }, [status]);

  if (status === 'missing') {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <IconBlob name="alert" index={3} size={96} iconSize={44} color={brand.rosyDark} />
        <PageHead title="Hmm, hindi namin makita 'yan." sub="Check the code and try again." />
        <Button label="Join a Gala" onPress={() => router.replace('/join')} />
      </Screen>
    );
  }
  if (status === 'error') {
    return (
      <Screen style={{ alignItems: 'center', justifyContent: 'center' }}>
        <IconBlob name="alert" index={3} size={96} iconSize={44} color={brand.rosyDark} />
        <PageHead title="Hindi ma-load ang gala." sub={error} />
        <Button label="Try again" icon="refresh" onPress={() => void retry()} />
        <Button variant="cream" label="Back to My Galas" onPress={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }
  if (status !== 'ready') return null;
  return (
    <GalaShell>
      <Slot />
    </GalaShell>
  );
}
