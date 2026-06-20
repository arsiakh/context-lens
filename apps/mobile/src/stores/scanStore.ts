import { create } from "zustand";
import type { AnalyzeResponse } from "../types";
import { analyzePassage, AnalyzeError, type AnalyzeErrorKind } from "../services/api";

// Represents where the scan flow currently is.
// idle       → camera preview is showing, nothing captured yet
// captured   → photo taken, OCR not yet run
// extracting → OCR in progress
// extracted  → normalized text is ready, can call the API
// error      → something went wrong at the OCR stage
type ScanStatus = "idle" | "captured" | "extracting" | "extracted" | "error";

// Where the LLM analysis call is in its lifecycle.
type AnalyzeStatus = "idle" | "analyzing" | "done" | "error";
const BOOK_INFERENCE_THRESHOLD = 0.7;

interface AnalyzeErrorState {
  kind: AnalyzeErrorKind;
  message: string;
  retryAfterSeconds?: number;
}

interface ScanState {
  status: ScanStatus;
  imageUri: string | null;       // local file URI of the captured photo
  rawText: string | null;        // raw OCR output before normalization
  normalizedText: string | null; // cleaned text passed to the API
  ocrError: string | null;       // human-readable error shown in the UI

  // Analysis (LLM) state
  analyzeStatus: AnalyzeStatus;
  analyzeResponse: AnalyzeResponse | null;
  analyzeError: AnalyzeErrorState | null;
  bookTitleHint: string;
  authorHint: string;
  confirmedBookTitle: string | null;
  needsBookTitleConfirmation: boolean;

  // Actions
  setCaptured: (uri: string) => void;
  setExtracting: () => void;
  setExtracted: (raw: string, normalized: string) => void;
  setOcrError: (message: string) => void;
  setBookTitleHint: (title: string) => void;
  setAuthorHint: (author: string) => void;
  confirmBookTitle: (title: string) => void;
  loadPreviewAnalysis: (response: AnalyzeResponse, author?: string) => void;
  analyze: () => Promise<void>;
  reset: () => void;
}

export const useScanStore = create<ScanState>((set, get) => ({
  status: "idle",
  imageUri: null,
  rawText: null,
  normalizedText: null,
  ocrError: null,

  analyzeStatus: "idle",
  analyzeResponse: null,
  analyzeError: null,
  bookTitleHint: "",
  authorHint: "",
  confirmedBookTitle: null,
  needsBookTitleConfirmation: false,

  setCaptured: (uri) => set({ status: "captured", imageUri: uri, ocrError: null }),
  setExtracting: () => set({ status: "extracting" }),
  setExtracted: (raw, normalized) =>
    set({ status: "extracted", rawText: raw, normalizedText: normalized }),
  setOcrError: (message) => set({ status: "error", ocrError: message }),
  setBookTitleHint: (title) => set({ bookTitleHint: title }),
  setAuthorHint: (author) => set({ authorHint: author }),
  confirmBookTitle: (title) => {
    const cleaned = title.trim() || "Unknown Book";
    set({
      confirmedBookTitle: cleaned,
      bookTitleHint: cleaned === "Unknown Book" ? "" : cleaned,
      needsBookTitleConfirmation: false,
    });
  },
  loadPreviewAnalysis: (response, author = "") =>
    set({
      status: "extracted",
      rawText: response.normalizedText,
      normalizedText: response.normalizedText,
      ocrError: null,
      analyzeStatus: "done",
      analyzeResponse: response,
      analyzeError: null,
      authorHint: author,
      confirmedBookTitle: response.bookInference.title,
      needsBookTitleConfirmation: false,
    }),

  // Sends the normalized passage to the backend and stores the annotated result.
  // Screens read analyzeStatus/analyzeResponse/analyzeError and render accordingly.
  analyze: async () => {
    const { normalizedText: text, bookTitleHint, authorHint } = get();
    if (!text) return;
    set({ analyzeStatus: "analyzing", analyzeError: null, needsBookTitleConfirmation: false });
    try {
      const cleanedHint = bookTitleHint.trim();
      const cleanedAuthor = authorHint.trim();
      const response = await analyzePassage(text, {
        bookTitle: cleanedHint,
        author: cleanedAuthor,
      });
      const inferredTitle = response.bookInference.title?.trim() || null;
      const highConfidence = response.bookInference.confidence >= BOOK_INFERENCE_THRESHOLD;
      set({
        analyzeStatus: "done",
        analyzeResponse: response,
        confirmedBookTitle: cleanedHint || (highConfidence ? inferredTitle : null),
        needsBookTitleConfirmation: !cleanedHint && !highConfidence,
      });
    } catch (e) {
      const err: AnalyzeErrorState =
        e instanceof AnalyzeError
          ? { kind: e.kind, message: e.message, retryAfterSeconds: e.retryAfterSeconds }
          : { kind: "server", message: "Something went wrong. Please try again." };
      set({ analyzeStatus: "error", analyzeError: err });
    }
  },

  reset: () =>
    set({
      status: "idle",
      imageUri: null,
      rawText: null,
      normalizedText: null,
      ocrError: null,
      analyzeStatus: "idle",
      analyzeResponse: null,
      analyzeError: null,
      bookTitleHint: "",
      authorHint: "",
      confirmedBookTitle: null,
      needsBookTitleConfirmation: false,
    }),
}));
