import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser, AuthError } from "../src/auth";
import { runAnalysis, ModelFailureError } from "../src/runAnalysis";
import { limitAnalyzeRequest, RateLimitConfigError } from "../src/rateLimit";
import { validateAnalyzeInput } from "../src/validateAnalyzeInput";

// POST /api/analyze
// Body: { text: string }  — the normalized passage extracted on-device by OCR.
// Auth: Authorization: Bearer <supabase access token>
//
// Flow: method guard → JWT auth (401) → input validation → LLM analysis with
// fallback → 200 with cleaned AnalyzeResponse. Errors map to specific codes so
// the client can show actionable messages (never a generic "something went wrong").
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  // 1. Authentication — reject before doing any work (never process an anonymous request).
  let userId: string;
  try {
    const user = await requireUser(req);
    userId = user.id;
  } catch (e) {
    if (e instanceof AuthError) {
      return res.status(401).json({ error: e.message, code: "UNAUTHORIZED" });
    }
    console.error("[analyze] auth misconfiguration:", e);
    return res.status(500).json({ error: "Server auth configuration error.", code: "SERVER_ERROR" });
  }

  // 2. Input validation.
  const input = validateAnalyzeInput(req.body);
  if (!input.ok) {
    return res.status(input.status).json(input.body);
  }

  // 3. Rate limiting — protect the OpenAI budget before any model call.
  try {
    const rateLimit = await limitAnalyzeRequest(userId);
    if (!rateLimit.success) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
        code: "RATE_LIMITED",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }
  } catch (e) {
    if (e instanceof RateLimitConfigError) {
      console.error("[analyze] rate limit misconfiguration:", e.message);
      return res.status(500).json({ error: "Server rate limit configuration error.", code: "SERVER_ERROR" });
    }
    console.error("[analyze] rate limit check failed:", e);
    return res.status(500).json({ error: "Analysis failed. Please try again.", code: "SERVER_ERROR" });
  }

  // 4. Analysis with model fallback.
  try {
    const { response, fallbackEvents } = await runAnalysis(input.text, input.hint);
    console.log(
      JSON.stringify({
        event: "analyze_success",
        userId,
        model: response.meta.model,
        latencyMs: response.meta.latencyMs,
        fallbackUsed: response.meta.fallbackUsed,
        fallbackEvents,
        counts: {
          vocab: response.vocab.length,
          inBookRefs: response.inBookRefs.length,
          realWorldRefs: response.realWorldRefs.length,
        },
      })
    );
    return res.status(200).json(response);
  } catch (e) {
    if (e instanceof ModelFailureError) {
      console.error(JSON.stringify({ event: "analyze_model_failure", userId, reason: e.message }));
      return res.status(500).json({ error: "Analysis failed. Please try again.", code: "MODEL_FAILURE" });
    }
    console.error(JSON.stringify({ event: "analyze_error", userId, reason: String(e) }));
    return res.status(500).json({ error: "Analysis failed. Please try again.", code: "SERVER_ERROR" });
  }
}
