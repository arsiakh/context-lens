import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ANALYZE_LIMIT = 20;
const ANALYZE_WINDOW = "1 h";

export class RateLimitConfigError extends Error {}

export interface RateLimitResult {
  success: boolean;
  retryAfterSeconds?: number;
}

let analyzeLimiter: Ratelimit | null = null;

function getAnalyzeLimiter(): Ratelimit {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new RateLimitConfigError("Missing Upstash Redis env vars on the backend.");
  }

  if (!analyzeLimiter) {
    analyzeLimiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(ANALYZE_LIMIT, ANALYZE_WINDOW),
      prefix: "context-lens",
    });
  }

  return analyzeLimiter;
}

export async function limitAnalyzeRequest(userId: string): Promise<RateLimitResult> {
  const result = await getAnalyzeLimiter().limit(`analyze:${userId}`);
  if (result.success) return { success: true };

  return {
    success: false,
    retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}
