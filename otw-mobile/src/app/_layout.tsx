import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { isApiError } from '@/api/client';
import { PermissionsGate } from '@/components/PermissionsGate';
import { ToastHost } from '@/components/ToastHost';
import { hydrateKv } from '@/lib/otw/kv';
import { supabase } from '@/lib/supabase';
import { fontAssets } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry network blips, never auth / permission / not-found answers.
      retry: (count, e) => count < 2 && (!isApiError(e) || e.status === 0 || e.status >= 500),
    },
  },
});

// Refetch when the app comes back to the foreground or the network returns.
onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(!!s.isConnected)));
AppState.addEventListener('change', (state) => {
  if (Platform.OS !== 'web') focusManager.setFocused(state === 'active');
});

/** undefined = not read yet. */
function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

function useKvReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void hydrateKv().then(() => setReady(true));
  }, []);
  return ready;
}

function RootStack() {
  const { colors, scheme } = useTheme();
  const session = useSession();
  const kvReady = useKvReady();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = (fontsLoaded || !!fontError) && session !== undefined && kvReady;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.bgPage, card: colors.surface, text: colors.text, border: colors.line, primary: colors.text },
  };
  const signedIn = !!session;

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgPage } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="join" />
          <Stack.Screen name="create" />
          <Stack.Screen name="history" />
          <Stack.Screen name="gala" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* Email-confirm / password-reset links land here signed in or not. */}
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="privacy" />
      </Stack>
      <ToastHost />
      <PermissionsGate />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    // Needed for the chat's swipe-to-reply and hold gestures.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {/* Edge-to-edge Android no longer resizes the window for the keyboard; this tracks it instead. */}
        <KeyboardProvider>
          <ThemeProvider>
            <RootStack />
          </ThemeProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
