import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../services/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  // Called once from App.tsx on mount to sync initial session and subscribe to changes.
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,

  initialize: () => {
    // Immediately load any persisted session from SecureStore.
    supabase.auth.getSession().then(({ data }) => {
      set({
        session: data.session,
        user: data.session?.user ?? null,
        isLoading: false,
      });
    });

    // Subscribe to sign-in / sign-out / token-refresh events.
    // This fires whenever signInWithApple() or signOut() succeeds.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
      });
    });

    // Return the unsubscribe function so App.tsx can clean up on unmount.
    return () => listener.subscription.unsubscribe();
  },
}));
