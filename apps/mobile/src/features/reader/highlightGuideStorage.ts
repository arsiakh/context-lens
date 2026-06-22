export const HIGHLIGHT_GUIDE_DISMISSED_KEY = "context-lens:reader-highlight-guide:v1";

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export async function shouldShowHighlightGuide(storage: KeyValueStorage): Promise<boolean> {
  try {
    return (await storage.getItem(HIGHLIGHT_GUIDE_DISMISSED_KEY)) !== "true";
  } catch {
    // Onboarding must never prevent the Reader from opening.
    return true;
  }
}

export async function persistHighlightGuideDismissal(storage: KeyValueStorage): Promise<void> {
  try {
    await storage.setItem(HIGHLIGHT_GUIDE_DISMISSED_KEY, "true");
  } catch {
    // The guide is still dismissed for this mounted Reader session.
  }
}
