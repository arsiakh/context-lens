export interface LatencyMarks {
  captureStartedAt: number | null;
  ocrCompletedAt: number | null;
  analysisStartedAt: number | null;
  analysisCompletedAt: number | null;
  readerRenderedAt: number | null;
}

export interface LatencyBreakdown {
  captureToOcrMs: number | null;
  apiMs: number | null;
  uiRenderMs: number | null;
  totalMs: number | null;
}

function delta(start: number | null, end: number | null): number | null {
  if (start === null || end === null || end < start) return null;
  return end - start;
}

export function getLatencyBreakdown(marks: LatencyMarks): LatencyBreakdown {
  return {
    captureToOcrMs: delta(marks.captureStartedAt, marks.ocrCompletedAt),
    apiMs: delta(marks.analysisStartedAt, marks.analysisCompletedAt),
    uiRenderMs: delta(marks.analysisCompletedAt, marks.readerRenderedAt),
    totalMs: delta(marks.captureStartedAt, marks.readerRenderedAt),
  };
}

export function formatLatencyMs(value: number | null): string {
  if (value === null) return "—";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}
