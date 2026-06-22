import { applyGuards, MAX_CHARS, normalize } from "./normalize";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS ✓" : "FAIL ✗"} ${name}`);
  if (condition) passed++;
  else failed++;
}

check(
  "collapses line breaks and repeated whitespace",
  normalize("  First  line\n\nSecond\tline  ") === "First line Second line"
);
check("removes soft hyphens", normalize("under\u00ADstanding") === "understanding");

const blank = applyGuards(normalize(" \n\t "));
check("rejects blank OCR output", blank.result === "" && blank.error !== null);

const short = applyGuards("Too short");
check("rejects output under twenty characters", short.result === "" && short.error !== null);

const exactMinimum = applyGuards("12345678901234567890");
check("accepts exactly twenty characters", exactMinimum.error === null);

const sentence = "A".repeat(MAX_CHARS - 12) + ". trailing text beyond the limit";
const truncatedAtSentence = applyGuards(sentence);
check(
  "truncates oversized output at the last sentence boundary",
  truncatedAtSentence.error === null
    && truncatedAtSentence.result.endsWith(".")
    && truncatedAtSentence.result.length <= MAX_CHARS
);

const noSentence = applyGuards("A".repeat(MAX_CHARS + 50));
check(
  "hard-truncates oversized output without punctuation",
  noSentence.error === null && noSentence.result.length === MAX_CHARS
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
