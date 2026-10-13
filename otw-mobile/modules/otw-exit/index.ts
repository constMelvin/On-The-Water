import { requireOptionalNativeModule } from 'expo';
import { BackHandler } from 'react-native';

/** Native side lives in android/ (Android only); missing on iOS and on APKs built before it existed. */
const OtwExit = requireOptionalNativeModule<{ exitApp(): void }>('OtwExit');

/** Closes OTW and removes it from Recents (Android). Falls back to BackHandler.exitApp(). */
export function exitApp(): void {
  if (OtwExit) OtwExit.exitApp();
  else BackHandler.exitApp();
}
