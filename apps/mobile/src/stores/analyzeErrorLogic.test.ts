import { getAnalyzeErrorTitle, getRetryCountdownSeconds } from "./analyzeErrorLogic";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) passed++;
  else {
    failed++;
    console.error(`FAIL ✗ ${name}`);
  }
  if (condition) console.log(`PASS ✓ ${name}`);
}

check(
  "offline errors get an offline title",
  getAnalyzeErrorTitle({ kind: "offline", message: "offline" }) === "You're offline"
);

check(
  "network errors get a connection title",
  getAnalyzeErrorTitle({ kind: "network", message: "network" }) === "Connection problem"
);

check("rate limit countdown starts at retryAfterSeconds", getRetryCountdownSeconds(30, 0) === 30);
check("rate limit countdown decreases with elapsed time", getRetryCountdownSeconds(30, 12_500) === 18);
check("rate limit countdown never goes below zero", getRetryCountdownSeconds(30, 35_000) === 0);
check("missing retryAfterSeconds has no countdown", getRetryCountdownSeconds(undefined, 0) === null);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
