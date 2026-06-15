import { createClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";

// Verifies the Supabase JWT sent by the mobile app in the Authorization header.
//
// The mobile client attaches `Authorization: Bearer <access_token>` to every
// /api/analyze call. We hand that token to Supabase, which checks the signature
// and expiry and returns the user. No service-role key is needed — the anon key
// plus the user's own token is enough to resolve their identity.

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

export class AuthError extends Error {}

export interface AuthedUser {
  id: string;
  email: string | null;
}

// Extracts and verifies the bearer token. Throws AuthError if missing/invalid,
// which the handler maps to a 401 response.
export async function requireUser(req: VercelRequest): Promise<AuthedUser> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Misconfiguration is a server fault, not a client auth failure — surface it clearly.
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars on the backend.");
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) {
    throw new AuthError("Missing Authorization bearer token.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthError("Invalid or expired session token.");
  }

  return { id: data.user.id, email: data.user.email ?? null };
}
