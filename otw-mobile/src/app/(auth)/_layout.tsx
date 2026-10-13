import { Stack } from 'expo-router';
import { ExitPrompt } from '@/components/ExitPrompt';

export default function AuthLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <ExitPrompt />
    </>
  );
}
