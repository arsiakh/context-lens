import { supabase } from "./client";

// NOTE: Apple Sign-in is deferred until a paid Apple Developer account is available.
// Free personal teams cannot use the "Sign In with Apple" capability, which blocks
// device provisioning. The previous signInWithApple() implementation (expo-apple-authentication
// + expo-crypto nonce flow) can be restored from git history when re-adding it.

// ─── Magic Link (Email) ───────────────────────────────────────────────────────
//
// Supabase sends a one-time sign-in link to the email address.
// The user taps it → the deep-link fires → Supabase exchanges it for a session.
// No password required. Works on simulator (the email arrives in the user's inbox).
//
// redirectTo must match the URL registered in Supabase:
//   Authentication → URL Configuration → Redirect URLs → contextlens://auth/callback

export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: "contextlens://auth/callback",
    },
  });
  if (error) throw error;
}

// ─── Email + Password ─────────────────────────────────────────────────────────
//
// Used during development to avoid magic link email rate limits.
// signUp() creates a new account; signInWithPassword() signs into an existing one.
// Supabase returns a session immediately — no email required.

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
