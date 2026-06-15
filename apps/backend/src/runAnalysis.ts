import OpenAI from "openai";
import { analyzeResponseSchema, type AnalyzeResponse } from "./types/analyzeSchema";
import { SYSTEM_PROMPT, REPAIR_PROMPT } from "./prompts";
import { validateRanges } from "./validateRanges";

// Orchestrates the LLM call with the 3-step fallback sequence from the Tech Spec:
//   1. gpt-4o-mini with the main prompt
//   2. gpt-4o-mini with the repair prompt (fed the failed output + Zod error)
//   3. gpt-4o (full model) with the main prompt
// Each step only runs if the previous step failed Zod validation. If all three
// fail, ModelFailureError is thrown and the handler returns 500 MODEL_FAILURE.

export class ModelFailureError extends Error {}

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY env var on the backend.");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

type ModelName = "gpt-4o-mini" | "gpt-4o";

interface Attempt {
  label: string;
  model: ModelName;
  parsed: AnalyzeResponse | null;
  error: string | null;
}

async function callModel(
  model: ModelName,
  systemPrompt: string,
  userContent: string
): Promise<{ raw: string }> {
  const completion = await getOpenAI().chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });
  return { raw: completion.choices[0]?.message?.content ?? "" };
}

// Parses raw model output and runs it through Zod. Never throws — returns the
// parsed response or a human-readable error string for logging / the repair step.
function tryParse(raw: string): { parsed: AnalyzeResponse | null; error: string | null } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { parsed: null, error: "Model output was not valid JSON." };
  }
  const result = analyzeResponseSchema.safeParse(json);
  if (!result.success) {
    return { parsed: null, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { parsed: result.data, error: null };
}

export interface AnalysisResult {
  response: AnalyzeResponse;
  fallbackEvents: { step: string; reason: string }[];
}

export async function runAnalysis(passage: string): Promise<AnalysisResult> {
  const startedAt = Date.now();
  const fallbackEvents: { step: string; reason: string }[] = [];
  const attempts: Attempt[] = [];

  // ── Attempt 1: gpt-4o-mini + main prompt ─────────────────────────────────────
  const first = await callModel("gpt-4o-mini", SYSTEM_PROMPT, passage);
  const firstParsed = tryParse(first.raw);
  attempts.push({ label: "mini", model: "gpt-4o-mini", ...firstParsed });

  let finalParsed = firstParsed.parsed;
  let finalModel: ModelName = "gpt-4o-mini";
  let fallbackUsed = false;

  // ── Attempt 2: gpt-4o-mini + repair prompt ───────────────────────────────────
  if (!finalParsed) {
    fallbackEvents.push({ step: "repair", reason: firstParsed.error ?? "unknown" });
    const repairUser = `PASSAGE:\n${passage}\n\nINVALID RESPONSE:\n${first.raw}\n\nVALIDATION ERROR:\n${firstParsed.error}`;
    const repair = await callModel("gpt-4o-mini", REPAIR_PROMPT, repairUser);
    const repairParsed = tryParse(repair.raw);
    attempts.push({ label: "repair", model: "gpt-4o-mini", ...repairParsed });
    if (repairParsed.parsed) {
      finalParsed = repairParsed.parsed;
      fallbackUsed = true;
    }
  }

  // ── Attempt 3: gpt-4o (full model) + main prompt ─────────────────────────────
  if (!finalParsed) {
    const prev = attempts[attempts.length - 1];
    fallbackEvents.push({ step: "gpt-4o", reason: prev.error ?? "unknown" });
    const full = await callModel("gpt-4o", SYSTEM_PROMPT, passage);
    const fullParsed = tryParse(full.raw);
    attempts.push({ label: "gpt-4o", model: "gpt-4o", ...fullParsed });
    if (fullParsed.parsed) {
      finalParsed = fullParsed.parsed;
      finalModel = "gpt-4o";
      fallbackUsed = true;
    }
  }

  if (!finalParsed) {
    const prev = attempts[attempts.length - 1];
    throw new ModelFailureError(prev.error ?? "All model attempts failed validation.");
  }

  // Stamp real metadata, then drop/repair bad ranges and resolve overlaps.
  const latencyMs = Date.now() - startedAt;
  const stamped: AnalyzeResponse = {
    ...finalParsed,
    meta: { model: finalModel, latencyMs, fallbackUsed },
  };

  return { response: validateRanges(stamped), fallbackEvents };
}
