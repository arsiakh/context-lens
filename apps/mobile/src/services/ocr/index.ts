import { extractTextFromImage, isSupported } from "expo-text-extractor";
import { normalize, applyGuards } from "./normalize";
import { OcrError, withOcrTimeout } from "./errors";

export { OcrError, OCR_TIMEOUT_MS } from "./errors";
export type { OcrErrorKind } from "./errors";

export interface OcrResult {
  normalizedText: string;
  rawText: string;
}

// Extracts text from a local image URI, normalizes it, and applies length guards.
// Throws OcrError (with a user-facing message) if extraction fails or text is unusable.
export async function extractAndNormalize(imageUri: string): Promise<OcrResult> {
  const startedAt = Date.now();

  try {
    if (!isSupported) {
      throw new OcrError("unsupported", "Text extraction is not supported on this device.");
    }

    let lines: string[];
    try {
      lines = await withOcrTimeout(extractTextFromImage(imageUri));
    } catch (error) {
      if (error instanceof OcrError) throw error;
      throw new OcrError("extraction_failed", "Text extraction failed. Retake the photo and try again.");
    }

    const raw = lines.join("\n");
    const normalized = normalize(raw);
    const { result, error } = applyGuards(normalized);

    if (error) {
      throw new OcrError("no_text", error);
    }

    console.info("[OCR] success", {
      durationMs: Date.now() - startedAt,
      characterCount: result.length,
    });
    return { normalizedText: result, rawText: raw };
  } catch (error) {
    const ocrError = error instanceof OcrError
      ? error
      : new OcrError("extraction_failed", "Text extraction failed. Retake the photo and try again.");
    console.warn("[OCR] failure", {
      durationMs: Date.now() - startedAt,
      kind: ocrError.kind,
    });
    throw ocrError;
  }
}
