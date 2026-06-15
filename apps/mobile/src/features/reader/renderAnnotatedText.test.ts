import { renderAnnotatedText } from "./renderAnnotatedText";
import type { InBookRef, RealWorldRef, VocabItem } from "../../types";

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

const join = (segments: ReturnType<typeof renderAnnotatedText>) =>
  segments.map((segment) => segment.text).join("");

const text = "Call me Ishmael. Some years ago.";

{
  const segments = renderAnnotatedText(text, [], [], []);
  check("plain text returns one segment", segments.length === 1 && segments[0].type === "plain");
  check("plain text preserves every character", join(segments) === text);
}

{
  const start = text.indexOf("Ishmael");
  const vocab: VocabItem[] = [
    { start, end: start + 7, term: "Ishmael", pos: "noun", definition: "A name.", example: "Ishmael spoke." },
  ];
  const segments = renderAnnotatedText(text, vocab, [], []);
  check("single annotation splits into three segments", segments.length === 3);
  check("single annotation has vocab type", segments[1].type === "vocab" && segments[1].text === "Ishmael");
  check("single annotation preserves every character", join(segments) === text);
}

{
  const call = text.indexOf("Call");
  const ishmael = text.indexOf("Ishmael");
  const vocab: VocabItem[] = [
    { start: call, end: call + 4, term: "Call", pos: "verb", definition: "Name.", example: "Call me." },
    { start: ishmael, end: ishmael + 7, term: "Ishmael", pos: "noun", definition: "A name.", example: "Ishmael spoke." },
  ];
  const segments = renderAnnotatedText(text, vocab, [], []);
  check("non-overlapping annotations both survive", segments.filter((segment) => segment.type === "vocab").length === 2);
  check("non-overlapping annotations preserve every character", join(segments) === text);
}

{
  const start = text.indexOf("Ishmael");
  const vocab: VocabItem[] = [
    { start, end: start + 7, term: "Ishmael", pos: "noun", definition: "A name.", example: "Ishmael spoke." },
  ];
  const inBookRefs: InBookRef[] = [
    { start, end: start + 7, label: "Ishmael", explanation: "Named in the passage.", confidence: 0.9 },
  ];
  const realWorldRefs: RealWorldRef[] = [
    { start, end: start + 7, label: "Ishmael", explanation: "Biblical name.", confidence: 0.9 },
  ];
  const segments = renderAnnotatedText(text, vocab, inBookRefs, realWorldRefs);
  check("real-world ref wins overlapping span", segments.some((segment) => segment.type === "realWorldRef" && segment.text === "Ishmael"));
  check("overlap resolution drops lower-priority span", !segments.some((segment) => segment.type === "vocab" || segment.type === "inBookRef"));
  check("overlap resolution preserves every character", join(segments) === text);
}

{
  const vocab: VocabItem[] = [
    { start: -1, end: 4, term: "Call", pos: "verb", definition: "Name.", example: "Call me." },
    { start: 999, end: 1000, term: "bad", pos: "noun", definition: "Bad.", example: "Bad." },
  ];
  const segments = renderAnnotatedText(text, vocab, [], []);
  check("invalid ranges are ignored", segments.length === 1 && segments[0].type === "plain");
  check("invalid ranges preserve every character", join(segments) === text);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
