import { useEffect } from "react";
import { Linking } from "react-native";
import RootNavigator from "./src/navigation/RootNavigator";
import { useAuthStore } from "./src/stores/authStore";
import { supabase } from "./src/services/supabase/client";

// Handle an incoming deep-link URL (e.g. contextlens://auth/callback?code=xxx).
// Supabase magic links and OAuth callbacks both arrive this way.
// exchangeCodeForSession() verifies the code, creates a session, and stores it —
// which fires onAuthStateChange in authStore, which updates session state,
// which causes RootNavigator to switch to the authenticated stack automatically.
async function handleDeepLink(url: string | null) {
  if (!url) return;
  if (!url.startsWith("contextlens://")) return;

  const { error } = await supabase.auth.exchangeCodeForSession(url);
  if (error) {
    console.warn("[deep-link] exchangeCodeForSession failed:", error.message);
  }
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    // 1. Start the Supabase auth session listener.
    const unsubscribeAuth = initialize();

    // 2. Cold-launch: app was closed when user tapped the magic link.
    //    getInitialURL() returns the URL that opened the app, or null if opened normally.
    Linking.getInitialURL().then(handleDeepLink);

    // 3. Warm-launch: app was already running in the background.
    //    'url' event fires whenever the app is foregrounded via a deep link.
    const linkingSubscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      unsubscribeAuth();
      linkingSubscription.remove();
    };
  }, [initialize]);

  return <RootNavigator />;
}
