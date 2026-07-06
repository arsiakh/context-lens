import { create } from "zustand";
import { getLatencyBreakdown, type LatencyBreakdown, type LatencyMarks } from "./latencyLogic";

interface LatencyState extends LatencyMarks {
  startCapture: (at?: number) => void;
  completeOcr: (at?: number) => void;
  startAnalysis: (at?: number) => void;
  completeAnalysis: (at?: number) => void;
  markReaderRendered: (at?: number) => void;
  reset: () => void;
  getBreakdown: () => LatencyBreakdown;
}

const emptyMarks: LatencyMarks = {
  captureStartedAt: null,
  ocrCompletedAt: null,
  analysisStartedAt: null,
  analysisCompletedAt: null,
  readerRenderedAt: null,
};

export const useLatencyStore = create<LatencyState>((set, get) => ({
  ...emptyMarks,
  startCapture: (at = Date.now()) => set({ ...emptyMarks, captureStartedAt: at }),
  completeOcr: (at = Date.now()) => set({ ocrCompletedAt: at }),
  startAnalysis: (at = Date.now()) => set({ analysisStartedAt: at, analysisCompletedAt: null, readerRenderedAt: null }),
  completeAnalysis: (at = Date.now()) => set({ analysisCompletedAt: at }),
  markReaderRendered: (at = Date.now()) => {
    const { readerRenderedAt } = get();
    if (readerRenderedAt === null) set({ readerRenderedAt: at });
  },
  reset: () => set(emptyMarks),
  getBreakdown: () => getLatencyBreakdown(get()),
}));
