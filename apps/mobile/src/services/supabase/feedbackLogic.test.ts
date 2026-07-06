import { getFeedbackAnnotationId, getFeedbackSuccessMessage } from "./feedbackLogic";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS ✓" : "FAIL ✗"} ${name}`);
  if (condition) passed++;
  else failed++;
}

check(
  "creates stable vocab annotation id",
  getFeedbackAnnotationId({
    type: "vocab",
    item: { start: 2, end: 7, term: "whale", pos: "noun", definition: "A mammal.", example: "The whale surfaced." },
  }) === "vocab:2:7:whale"
);

check(
  "creates stable reference annotation id",
  getFeedbackAnnotationId({
    type: "realWorldRef",
    item: { start: 10, end: 15, label: "Nile", explanation: "A river.", confidence: 0.9 },
  }) === "realWorldRef:10:15:Nile"
);

check("returns type-specific feedback copy", getFeedbackSuccessMessage("inBookRef") === "In-book feedback saved.");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
