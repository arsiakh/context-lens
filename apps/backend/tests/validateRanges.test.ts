import { validateRanges } from "../src/validateRanges";
import type { AnalyzeResponse } from "../src/types/analyzeSchema";

// Plain assertion-style tests, runnable with ts-node (same pattern as validateSchema.ts).
let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`PASS ✓ ${name}`);
  } else {
    failed++;
    console.log(`FAIL ✗ ${name}`);
  }
}

const base = (text: string): AnalyzeResponse => ({
  normalizedText: text,
  bookInference: { title: "Test", confidence: 0.9 },
  vocab: [],
  inBookRefs: [],
  realWorldRefs: [],
  meta: { model: "gpt-4o-mini", latencyMs: 0, fallbackUsed: false },
});

const TEXT = "It was the best of times, it was the worst of times.";

// 1. Correct offsets are kept untouched.
{
  const start = TEXT.indexOf("best");
  const r = validateRanges({
    ...base(TEXT),
    vocab: [{ start, end: start + 4, term: "best", pos: "adjective", definition: "d", example: "e" }],
  });
  check("keeps a correct vocab range", r.vocab.length === 1 && r.vocab[0].start === start);
}

// 2. Out-of-bounds range is dropped (term not findable).
{
  const r = validateRanges({
    ...base(TEXT),
    vocab: [{ start: 999, end: 1003, term: "zzzz", pos: "noun", definition: "d", example: "e" }],
  });
  check("drops an out-of-bounds, unfindable range", r.vocab.length === 0);
}

// 3. Wrong offsets but findable term → relocated.
{
  const r = validateRanges({
    ...base(TEXT),
    vocab: [{ start: 0, end: 4, term: "worst", pos: "adjective", definition: "d", example: "e" }],
  });
  const ok = r.vocab.length === 1 && TEXT.slice(r.vocab[0].start, r.vocab[0].end) === "worst";
  check("relocates a findable term with wrong offsets", ok);
}

// 4. Overlap resolution: realWorldRef beats vocab on the same span.
{
  const start = TEXT.indexOf("times");
  const span = { start, end: start + 5 };
  const r = validateRanges({
    ...base(TEXT),
    vocab: [{ ...span, term: "times", pos: "noun", definition: "d", example: "e" }],
    realWorldRefs: [{ ...span, label: "times", explanation: "x", confidence: 0.9 }],
  });
  check("realWorldRef wins overlap over vocab", r.vocab.length === 0 && r.realWorldRefs.length === 1);
}

// 5. Non-overlapping annotations of different types all survive.
{
  const bs = TEXT.indexOf("best");
  const ws = TEXT.indexOf("worst");
  const r = validateRanges({
    ...base(TEXT),
    vocab: [{ start: bs, end: bs + 4, term: "best", pos: "adjective", definition: "d", example: "e" }],
    realWorldRefs: [{ start: ws, end: ws + 5, label: "worst", explanation: "x", confidence: 0.8 }],
  });
  check("keeps non-overlapping annotations", r.vocab.length === 1 && r.realWorldRefs.length === 1);
}

// 6. Low-confidence references are dropped server-side before reaching the client.
{
  const start = TEXT.indexOf("times");
  const span = { start, end: start + 5 };
  const r = validateRanges({
    ...base(TEXT),
    inBookRefs: [{ ...span, label: "times", explanation: "x", confidence: 0.49 }],
    realWorldRefs: [{ ...span, label: "times", explanation: "x", confidence: 0.5 }],
  });
  check("drops references below the confidence threshold", r.inBookRefs.length === 0 && r.realWorldRefs.length === 1);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
