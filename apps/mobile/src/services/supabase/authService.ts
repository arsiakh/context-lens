import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "./client";

// ─── Apple Sign-in ────────────────────────────────────────────────────────────
//
// Flow:
//   1. Generate a random nonce (prevents replay attacks).
//   2. SHA-256 hash it — Apple receives the hash, we keep the raw value.
//   3. Apple returns an identityToken (JWT) + the nonce it signed.
//   4. We pass both to Supabase, which verifies the token and creates a session.
//
// Why PKCE / nonce matters: without it, an intercepted identityToken could be
// replayed by an attacker. Supabase validates that the nonce in the token matches
// what we sent, so intercepted tokens are useless.

function generateNonce(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input
  );
  return digest;
}

export async function signInWithApple(): Promise<void> {
  const rawNonce = generateNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  // This opens the native Apple Sign-in sheet. Throws AppleAuthenticationError
  // if the user cancels or if the device doesn't support it.
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  const identityToken = credential.identityToken;
  if (!identityToken) {
    throw new Error("Apple Sign-in did not return an identity token.");
  }

  // Exchange with Supabase. On success, supabase.auth session is set automatically
  // and the authStore listener (onAuthStateChange) fires to update app state.
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: identityToken,
    nonce: rawNonce,
  });

  if (error) throw error;
}

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
