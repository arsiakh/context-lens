export const MIN_TEXT_CHARS = 20;
export const MAX_TEXT_CHARS = 2000;
const MAX_TITLE_CHARS = 120;
const MAX_AUTHOR_CHARS = 120;

export interface AnalyzeRequestHint {
  bookTitle: string | null;
  author: string | null;
}

export type AnalyzeInputValidation =
  | { ok: true; text: string; hint: AnalyzeRequestHint }
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

  return { ok: true, text, hint: parseHint(body) };
}

function parseHint(body: unknown): AnalyzeRequestHint {
  if (body === null || typeof body !== "object" || !("hint" in body)) {
    return { bookTitle: null, author: null };
  }

  const hint = body.hint;
  if (hint === null || typeof hint !== "object") {
    return { bookTitle: null, author: null };
  }

  return {
    bookTitle: parseHintString("bookTitle" in hint ? hint.bookTitle : null, MAX_TITLE_CHARS),
    author: parseHintString("author" in hint ? hint.author : null, MAX_AUTHOR_CHARS),
  };
}

function parseHintString(value: unknown, maxChars: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, maxChars);
  return cleaned.length > 0 ? cleaned : null;
}
