import type { AnalyzeResponse, InBookRef, RealWorldRef, VocabItem } from "../../types";

export type AnnotationType = "plain" | "vocab" | "inBookRef" | "realWorldRef";

export interface AnnotatedTextSegment {
  text: string;
  type: AnnotationType;
  annotationIndex: number | null;
}

type RangeCandidate = {
  start: number;
  end: number;
  type: Exclude<AnnotationType, "plain">;
  annotationIndex: number;
  priority: number;
};

const PRIORITY: Record<Exclude<AnnotationType, "plain">, number> = {
  vocab: 1,
  inBookRef: 2,
  realWorldRef: 3,
};

export function renderAnnotatedText(
  text: string,
  vocab: VocabItem[],
  inBookRefs: InBookRef[],
  realWorldRefs: RealWorldRef[]
): AnnotatedTextSegment[] {
  const accepted = resolveRanges(text, [
    ...vocab.map((item, annotationIndex) => toCandidate(item, "vocab", annotationIndex)),
    ...inBookRefs.map((item, annotationIndex) => toCandidate(item, "inBookRef", annotationIndex)),
    ...realWorldRefs.map((item, annotationIndex) => toCandidate(item, "realWorldRef", annotationIndex)),
  ]);

  if (accepted.length === 0) {
    return text.length > 0 ? [{ text, type: "plain", annotationIndex: null }] : [];
  }

  const segments: AnnotatedTextSegment[] = [];
  let cursor = 0;

  for (const range of accepted.sort((a, b) => a.start - b.start)) {
    if (cursor < range.start) {
      segments.push({ text: text.slice(cursor, range.start), type: "plain", annotationIndex: null });
    }
    segments.push({
      text: text.slice(range.start, range.end),
      type: range.type,
      annotationIndex: range.annotationIndex,
    });
    cursor = range.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), type: "plain", annotationIndex: null });
  }

  return segments.filter((segment) => segment.text.length > 0);
}

export function renderAnnotatedResponse(response: AnalyzeResponse): AnnotatedTextSegment[] {
  return renderAnnotatedText(
    response.normalizedText,
    response.vocab,
    response.inBookRefs,
    response.realWorldRefs
  );
}

function toCandidate(
  range: { start: number; end: number },
  type: Exclude<AnnotationType, "plain">,
  annotationIndex: number
): RangeCandidate {
  return {
    start: range.start,
    end: range.end,
    type,
    annotationIndex,
    priority: PRIORITY[type],
  };
}

function resolveRanges(text: string, ranges: RangeCandidate[]): RangeCandidate[] {
  const valid = ranges.filter((range) =>
    Number.isInteger(range.start) &&
    Number.isInteger(range.end) &&
    range.start >= 0 &&
    range.start < range.end &&
    range.end <= text.length
  );

  const accepted: RangeCandidate[] = [];
  for (const range of valid.sort((a, b) => b.priority - a.priority || a.start - b.start)) {
    if (accepted.some((current) => overlaps(current, range))) continue;
    accepted.push(range);
  }

  return accepted;
}

function overlaps(a: RangeCandidate, b: RangeCandidate): boolean {
  return a.start < b.end && b.start < a.end;
}
