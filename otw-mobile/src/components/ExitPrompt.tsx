import { useFocusEffect, usePathname } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler } from 'react-native';
import { exitApp } from '../../modules/otw-exit';
import { ConfirmSheet } from './ConfirmSheet';

/**
 * Android back on the app's first screen ('/': My Galas, or the landing page when signed out) would
 * close OTW: ask first. Use it in a layout; it only listens while that layout is on screen, and back
 * anywhere else keeps its normal behaviour. Swiping OTW away from Recents can't be caught.
 */
export function ExitPrompt() {
  const pathname = usePathname();
  const [asking, setAsking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (pathname !== '/') return false;
        setAsking(true);
        return true;
      });
      return () => sub.remove();
    }, [pathname]),
  );

  if (!asking) return null;
  return (
    <ConfirmSheet
      title="Close OTW?"
      body="Your galas stay saved. See you sa next gala!"
      confirm="Close"
      onClose={() => setAsking(false)}
      onConfirm={exitApp}
    />
  );
}
