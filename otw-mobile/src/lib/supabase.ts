import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { LargeSecureStore } from "./secure-storage";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // no browser URL in a native app
      flowType: "pkce", // email confirm links return ?code= to otw://auth-callback
    },
  },
);

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
