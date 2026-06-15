import type { AnalyzeResponse } from "./types/analyzeSchema";

// Server-side range validation + overlap resolution.
//
// Even after a response passes Zod (which only checks shape/types), the LLM can
// still emit offsets that are out of bounds, inverted, or point at the wrong text.
// This pass:
//   1. Drops any annotation whose [start, end) is out of bounds or inverted.
//   2. Loosely verifies the sliced text matches the term/label; if not, tries to
//      relocate the term/label in the passage and corrects the offsets.
//   3. Drops low-confidence references (< 0.50) before the client sees them.
//   4. Resolves overlaps by priority: realWorldRef > inBookRef > vocab.
//
// It is a pure function (input in, cleaned output out) so it can be unit-tested.

type Priority = 1 | 2 | 3;
const PRIORITY = { vocab: 1, inBookRef: 2, realWorldRef: 3 } as const;
const MIN_REFERENCE_CONFIDENCE = 0.5;

type AnyRange = { start: number; end: number };

// Collapse whitespace + lowercase so "the   Road" loosely matches "the Road".
function loose(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

// Returns corrected {start,end} if the range is valid (possibly relocated), else null.
function resolveRange(
  text: string,
  range: AnyRange,
  expected: string
): AnyRange | null {
  const len = text.length;
  const { start, end } = range;

  // In-bounds, non-inverted, and the slice loosely matches the expected term/label.
  if (
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 0 &&
    end <= len &&
    start < end &&
    loose(text.slice(start, end)) === loose(expected)
  ) {
    return { start, end };
  }

  // Offsets were wrong — try to relocate the exact term/label in the passage.
  const idx = text.indexOf(expected);
  if (idx !== -1) {
    return { start: idx, end: idx + expected.length };
  }

  // Case-insensitive relocation as a last resort.
  const lowerIdx = text.toLowerCase().indexOf(expected.toLowerCase());
  if (lowerIdx !== -1) {
    return { start: lowerIdx, end: lowerIdx + expected.length };
  }

  return null;
}

// Two half-open intervals overlap if they share any character position.
function overlaps(a: AnyRange, b: AnyRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function validateRanges(response: AnalyzeResponse): AnalyzeResponse {
  const text = response.normalizedText;

  // Tag every annotation with its source array + priority, fixing/dropping ranges.
  type Tagged = {
    priority: Priority;
    kind: "vocab" | "inBookRef" | "realWorldRef";
    range: AnyRange;
    item: unknown;
  };
  const tagged: Tagged[] = [];

  for (const v of response.vocab) {
    const r = resolveRange(text, v, v.term);
    if (r) tagged.push({ priority: PRIORITY.vocab, kind: "vocab", range: r, item: { ...v, ...r } });
  }
  for (const ref of response.inBookRefs) {
    if (ref.confidence < MIN_REFERENCE_CONFIDENCE) continue;
    const r = resolveRange(text, ref, ref.label);
    if (r) tagged.push({ priority: PRIORITY.inBookRef, kind: "inBookRef", range: r, item: { ...ref, ...r } });
  }
  for (const ref of response.realWorldRefs) {
    if (ref.confidence < MIN_REFERENCE_CONFIDENCE) continue;
    const r = resolveRange(text, ref, ref.label);
    if (r) tagged.push({ priority: PRIORITY.realWorldRef, kind: "realWorldRef", range: r, item: { ...ref, ...r } });
  }

  // Greedy overlap resolution: highest priority first, then earliest start.
  // Keep an annotation only if it does not overlap one already accepted.
  tagged.sort((a, b) => b.priority - a.priority || a.range.start - b.range.start);

  const accepted: Tagged[] = [];
  for (const t of tagged) {
    if (accepted.some((a) => overlaps(a.range, t.range))) continue;
    accepted.push(t);
  }

  // Rebuild the three arrays, sorted by start offset for stable client rendering.
  const byStart = (a: Tagged, b: Tagged) => a.range.start - b.range.start;
  const pick = (kind: Tagged["kind"]) =>
    accepted.filter((t) => t.kind === kind).sort(byStart).map((t) => t.item);

  return {
    ...response,
    vocab: pick("vocab") as AnalyzeResponse["vocab"],
    inBookRefs: pick("inBookRef") as AnalyzeResponse["inBookRefs"],
    realWorldRefs: pick("realWorldRef") as AnalyzeResponse["realWorldRefs"],
  };
}
