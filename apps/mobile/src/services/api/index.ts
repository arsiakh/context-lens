import { supabase } from "../supabase/client";
import type { AnalyzeResponse } from "../../types";

// Client for the backend /api/analyze endpoint.
//
// The screen never calls this directly with side effects — it goes through the
// scanStore, which owns loading/error state. This module only knows how to make
// the request, attach the Supabase JWT, and translate HTTP status codes into
// typed errors the UI can render with a specific, actionable message.

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
export const ANALYZE_TIMEOUT_MS = 45_000;

export type AnalyzeErrorKind =
  | "unauthorized"
  | "rate_limited"
  | "invalid_input"
  | "model_failure"
  | "timeout"
  | "network"
  | "server";

export class AnalyzeError extends Error {
  kind: AnalyzeErrorKind;
  retryAfterSeconds?: number;
  constructor(kind: AnalyzeErrorKind, message: string, retryAfterSeconds?: number) {
    super(message);
    this.kind = kind;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface AnalyzePassageHint {
  bookTitle?: string | null;
  author?: string | null;
}

export async function analyzePassage(text: string, hint: AnalyzePassageHint = {}): Promise<AnalyzeResponse> {
  if (!API_URL) {
    throw new AnalyzeError("server", "API URL is not configured. Set EXPO_PUBLIC_API_URL.");
  }

  // Grab the current access token for the Authorization header.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new AnalyzeError("unauthorized", "Your session expired. Please sign in again.");
  }

  let res: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);
  try {
    res = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        hint: {
          bookTitle: hint.bookTitle?.trim() || null,
          author: hint.author?.trim() || null,
        },
      }),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new AnalyzeError("timeout", "Analysis took too long. Please try again.");
    }
    throw new AnalyzeError("network", "Couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }

  if (res.ok) {
    return (await res.json()) as AnalyzeResponse;
  }

  // Map known status codes to specific, actionable messages.
  if (res.status === 401) {
    throw new AnalyzeError("unauthorized", "Your session expired. Please sign in again.");
  }
  if (res.status === 429) {
    const retryAfterSeconds = await readRetryAfter(res);
    throw new AnalyzeError(
      "rate_limited",
      "You've hit the hourly limit. Please wait a bit and try again.",
      retryAfterSeconds
    );
  }
  if (res.status === 400) {
    throw new AnalyzeError("invalid_input", "This passage couldn't be analyzed. Try retaking the photo.");
  }

  // 500s — distinguish a model failure from a generic server error if the body says so.
  const code = await readErrorCode(res);
  if (code === "MODEL_FAILURE") {
    throw new AnalyzeError("model_failure", "Analysis failed. Please try again.");
  }
  throw new AnalyzeError("server", "Something went wrong on our end. Please try again.");
}

async function readRetryAfter(res: Response): Promise<number | undefined> {
  try {
    const body = (await res.clone().json()) as { retryAfterSeconds?: number };
    if (typeof body.retryAfterSeconds === "number") return body.retryAfterSeconds;
  } catch {
    /* ignore */
  }
  const header = res.headers.get("retry-after");
  return header ? Number(header) || undefined : undefined;
}

async function readErrorCode(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { code?: string };
    return body.code;
  } catch {
    return undefined;
  }
}
