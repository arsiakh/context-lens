import { create } from "zustand";

// Represents where the scan flow currently is.
// idle       → camera preview is showing, nothing captured yet
// captured   → photo taken, OCR not yet run
// extracting → OCR in progress
// extracted  → normalized text is ready, can call the API
// error      → something went wrong at the OCR stage
type ScanStatus = "idle" | "captured" | "extracting" | "extracted" | "error";

interface ScanState {
  status: ScanStatus;
  imageUri: string | null;       // local file URI of the captured photo
  rawText: string | null;        // raw OCR output before normalization
  normalizedText: string | null; // cleaned text passed to the API
  ocrError: string | null;       // human-readable error shown in the UI

  // Actions
  setCaptured: (uri: string) => void;
  setExtracting: () => void;
  setExtracted: (raw: string, normalized: string) => void;
  setOcrError: (message: string) => void;
  reset: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  status: "idle",
  imageUri: null,
  rawText: null,
  normalizedText: null,
  ocrError: null,

  setCaptured: (uri) => set({ status: "captured", imageUri: uri, ocrError: null }),
  setExtracting: () => set({ status: "extracting" }),
  setExtracted: (raw, normalized) =>
    set({ status: "extracted", rawText: raw, normalizedText: normalized }),
  setOcrError: (message) => set({ status: "error", ocrError: message }),
  reset: () =>
    set({
      status: "idle",
      imageUri: null,
      rawText: null,
      normalizedText: null,
      ocrError: null,
    }),
}));
