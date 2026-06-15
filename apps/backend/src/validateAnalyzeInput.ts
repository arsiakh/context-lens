export const MIN_TEXT_CHARS = 20;
export const MAX_TEXT_CHARS = 2000;

export type AnalyzeInputValidation =
  | { ok: true; text: string }
  | { ok: false; status: 400; body: { error: string; code: "INVALID_INPUT"; maxChars?: number } };

export function validateAnalyzeInput(body: unknown): AnalyzeInputValidation {
  const text =
    body !== null &&
    typeof body === "object" &&
    "text" in body &&
    typeof body.text === "string"
      ? body.text
      : "";

  if (text.trim().length < MIN_TEXT_CHARS) {
    return {
      ok: false,
      status: 400,
      body: { error: "Passage text is too short to analyze.", code: "INVALID_INPUT" },
    };
  }

  if (text.length > MAX_TEXT_CHARS) {
    return {
      ok: false,
      status: 400,
      body: {
        error: "Passage text is too long to analyze.",
        code: "INVALID_INPUT",
        maxChars: MAX_TEXT_CHARS,
      },
    };
  }

  return { ok: true, text };
}
