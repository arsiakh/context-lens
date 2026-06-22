import { shouldDismissReferenceSheet } from "./referenceSheetGesture";

const cases: Array<[string, number, number, boolean]> = [
  ["dismisses after a long downward drag", 100, 0.2, true],
  ["dismisses after a quick downward flick", 30, 1.1, true],
  ["returns a short slow drag to the open position", 30, 0.2, false],
  ["does not dismiss for upward movement", -30, -1, false],
];

let failed = 0;
for (const [name, distance, velocity, expected] of cases) {
  const passed = shouldDismissReferenceSheet(distance, velocity) === expected;
  console.log(`${passed ? "PASS ✓" : "FAIL ✗"} ${name}`);
  if (!passed) failed++;
}

console.log(`\n${cases.length - failed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
