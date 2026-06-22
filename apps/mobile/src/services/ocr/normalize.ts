// Maximum character length passed to the API.
// If OCR produces more, we truncate to the nearest sentence boundary before this limit.
export const MAX_CHARS = 2000;

export function normalize(input: string): string {
  return input
    .replace(/[\n\r]+/g, " ")   // collapse line breaks to spaces
    .replace(/[ \t]+/g, " ")    // collapse multiple spaces/tabs
    .replace(/\u00AD/g, "")     // strip soft hyphens
    .trim();
}

export function applyGuards(text: string): { result: string; error: string | null } {
  if (text.length < 20) {
    return {
      result: "",
      error: "No text detected. Try adjusting the angle or lighting, or capture a page with clear text.",
    };
  }

  if (text.length > MAX_CHARS) {
    // Truncate to the nearest sentence boundary (. ! ?) before the limit.
    const truncated = text.slice(0, MAX_CHARS);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf("."),
      truncated.lastIndexOf("!"),
      truncated.lastIndexOf("?")
    );
    const result = lastSentenceEnd > 0 ? truncated.slice(0, lastSentenceEnd + 1) : truncated;
    return { result, error: null };
  }

  return { result: text, error: null };
}
