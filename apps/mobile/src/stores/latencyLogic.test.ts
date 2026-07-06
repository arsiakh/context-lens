import { formatLatencyMs, getLatencyBreakdown } from "./latencyLogic";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS ✓" : "FAIL ✗"} ${name}`);
  if (condition) passed++;
  else failed++;
}

const breakdown = getLatencyBreakdown({
  captureStartedAt: 100,
  ocrCompletedAt: 600,
  analysisStartedAt: 900,
  analysisCompletedAt: 1900,
  readerRenderedAt: 2200,
});

check("computes capture to OCR latency", breakdown.captureToOcrMs === 500);
check("computes API latency", breakdown.apiMs === 1000);
check("computes UI render latency", breakdown.uiRenderMs === 300);
check("computes total latency", breakdown.totalMs === 2100);

const incomplete = getLatencyBreakdown({
  captureStartedAt: 100,
  ocrCompletedAt: null,
  analysisStartedAt: null,
  analysisCompletedAt: null,
  readerRenderedAt: null,
});

check("returns null for incomplete intervals", incomplete.captureToOcrMs === null && incomplete.totalMs === null);
check("formats millisecond values", formatLatencyMs(999) === "999ms");
check("formats second values", formatLatencyMs(1250) === "1.3s");
check("formats missing values", formatLatencyMs(null) === "—");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
