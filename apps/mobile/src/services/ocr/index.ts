import { extractTextFromImage, isSupported } from "expo-text-extractor";
import { normalize, applyGuards } from "./normalize";

export interface OcrResult {
  normalizedText: string;
  rawText: string;
}

export interface OcrError {
  message: string;
}

// Extracts text from a local image URI, normalizes it, and applies length guards.
// Throws OcrError (with a user-facing message) if extraction fails or text is unusable.
export async function extractAndNormalize(imageUri: string): Promise<OcrResult> {
  if (!isSupported) {
    throw { message: "Text extraction is not supported on this device." } as OcrError;
  }

  const lines = await extractTextFromImage(imageUri);
  const raw = lines.join("\n");
  const normalized = normalize(raw);
  const { result, error } = applyGuards(normalized);

  if (error) {
    throw { message: error } as OcrError;
  }

  return { normalizedText: result, rawText: raw };
}
