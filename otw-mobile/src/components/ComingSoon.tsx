import { router } from 'expo-router';
import { Button, IconBlob, PageHead, Screen } from './ui';
import type { IconName } from './Icon';

/** Placeholder for a gala feature screen not built yet (guide Step 7 lists its endpoints and phase). */
export function ComingSoon({ title, phase, icon = 'sparkle' }: { title: string; phase: string; icon?: IconName }) {
  return (
    <Screen>
      <IconBlob name={icon} index={1} size={96} iconSize={44} />
      <PageHead title={title} sub={`Coming soon sa app (${phase}). Use the web app for this muna.`} />
      <Button variant="teal" icon="back" label="Back" onPress={() => router.back()} />
    </Screen>
  );
}
