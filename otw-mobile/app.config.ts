import type { ExpoConfig } from 'expo/config';

/** From `eas init`. Paste it here once you have it. */
const EAS_PROJECT_ID = '';

const config: ExpoConfig = {
  name: 'OTW',
  slug: 'otw',
  scheme: 'otw', // deep links: otw://gala/OTW-XXXX-XXXX, otw://auth-callback
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic', // light + dark (guide Step 6)
  ios: {
    bundleIdentifier: 'com.gala.otw',
    infoPlist: {
      NSCameraUsageDescription: 'Scan a gala QR code and take photos for the Gala Dump.',
      NSPhotoLibraryUsageDescription: 'Pick photos and videos for the Gala Dump.',
      NSLocationWhenInUseUsageDescription: 'Share your live location with your gala.',
    },
  },
  android: {
    package: 'com.gala.otw',
    // Asked on first open (components/PermissionsGate.tsx) and again where each feature needs it.
    permissions: ['CAMERA', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'POST_NOTIFICATIONS'],
    adaptiveIcon: {
      backgroundColor: '#fff8f2',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#fff8f2',
        dark: { backgroundColor: '#0e2229' },
        image: './assets/images/splash-logo.png',
        imageWidth: 280,
      },
    ],
    'expo-secure-store',
    'expo-notifications',
    [
      'expo-image-picker',
      {
        photosPermission: 'Pick photos and videos for the Gala Dump, the chat and your profile.',
        cameraPermission: 'Take photos for the chat and the Gala Dump.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Share your live location with your gala, only while sharing is on.',
      },
    ],
    'expo-font',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    // `eas init` prints this id. app.config.ts is code, so EAS can't write it for you: paste it here.
    // getExpoPushTokenAsync fails on iOS (and is unreliable on Android) without it.
    // Leave it out until `eas init` gives the real id (a placeholder makes `eas build` fail).
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
};

export default config;
