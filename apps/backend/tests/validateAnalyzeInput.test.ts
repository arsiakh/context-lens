import { MAX_TEXT_CHARS, validateAnalyzeInput } from "../src/validateAnalyzeInput";

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

{
  const result = validateAnalyzeInput({ text: "This passage is definitely long enough." });
  check("accepts valid passage text", result.ok && result.text.includes("passage"));
}

{
  const result = validateAnalyzeInput({ text: "too short" });
  check("rejects short passage text", !result.ok && result.status === 400 && result.body.code === "INVALID_INPUT");
}

{
  const result = validateAnalyzeInput({ text: "x".repeat(MAX_TEXT_CHARS + 1) });
  check("rejects oversized passage text", !result.ok && result.body.maxChars === MAX_TEXT_CHARS);
}

{
  const result = validateAnalyzeInput({});
  check("rejects missing text", !result.ok && result.body.code === "INVALID_INPUT");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
