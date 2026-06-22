import { OcrError, withOcrTimeout } from "./errors";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS ✓" : "FAIL ✗"} ${name}`);
  if (condition) passed++;
  else failed++;
}

async function run() {
  const value = await withOcrTimeout(Promise.resolve("recognized"), 50);
  check("returns an extraction that completes in time", value === "recognized");

  try {
    await withOcrTimeout(new Promise(() => undefined), 5);
    check("rejects extraction that exceeds its deadline", false);
  } catch (error) {
    check(
      "rejects extraction that exceeds its deadline",
      error instanceof OcrError && error.kind === "timeout"
    );
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void run();
