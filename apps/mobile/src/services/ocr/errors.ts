export type OcrErrorKind = "unsupported" | "no_text" | "timeout" | "extraction_failed";

export class OcrError extends Error {
  constructor(public readonly kind: OcrErrorKind, message: string) {
    super(message);
    this.name = "OcrError";
  }
}

export const OCR_TIMEOUT_MS = 15_000;

export async function withOcrTimeout<T>(operation: Promise<T>, timeoutMs = OCR_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new OcrError("timeout", "Text extraction took too long. Retake the photo and try again."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
