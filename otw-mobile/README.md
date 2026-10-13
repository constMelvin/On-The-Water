# OTW mobile

The OTW ("On The Water") gala planner for Android and iOS: Expo SDK 57, Expo Router, React Native.
It is a port of the web app (`../otw-client`) and talks to the same backend (`../otw-server`).

Full setup, from installing the tools to store release: `../docs/mobile/MOBILE_APP_GUIDE.md`.

## Run it

1. Copy the values into `otw-mobile/.env` (gitignored):

   ```
   EXPO_PUBLIC_BACKEND_URL=http://<your PC's LAN IP>:8080
   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
   ```

2. Start the backend (see the guide, Step 3), then:

   ```
   npm install
   npx expo start
   ```

3. Open it in Expo Go on a phone on the same Wi-Fi.

## Checks

```
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Layout

- `src/app/` screens (Expo Router). `gala/[roomId]/*` are the gala tabs, same names as the web.
- `src/components/` UI. `ui.tsx` is the design system ported from `otw-client/src/styles/otw.css`.
- `src/lib/api`, `src/lib/otw` logic copied from `otw-client/src/lib` (kept in step with the web).
- `assets/images/` the OTW logo and the app icons made from it.
