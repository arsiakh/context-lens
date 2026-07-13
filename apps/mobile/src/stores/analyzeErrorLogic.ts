import type { AnalyzeErrorKind } from "../services/api";

export interface AnalyzeErrorState {
  kind: AnalyzeErrorKind;
  message: string;
  retryAfterSeconds?: number;
}

export function getAnalyzeErrorTitle(error: AnalyzeErrorState | null): string {
  switch (error?.kind) {
    case "offline":
      return "You're offline";
    case "network":
      return "Connection problem";
    case "timeout":
      return "Analysis timed out";
    case "rate_limited":
      return "Hourly limit reached";
    case "unauthorized":
      return "Sign in required";
    default:
      return "Analysis failed";
  }
}

export function getRetryCountdownSeconds(retryAfterSeconds: number | undefined, elapsedMs: number): number | null {
  if (retryAfterSeconds == null) return null;
  return Math.max(0, retryAfterSeconds - Math.floor(elapsedMs / 1000));
}
