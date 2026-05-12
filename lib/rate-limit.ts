import { getKv } from "@/lib/cloudflare";

const LIMIT = 5;
const WINDOW_SECONDS = 60 * 60 * 24;

interface RateLimitState {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  skipped?: boolean;
}

export async function enforceSubmissionRateLimit(ip: string | undefined): Promise<RateLimitResult> {
  if (!ip) {
    return {
      allowed: true,
      limit: LIMIT,
      remaining: LIMIT,
      resetAt: Date.now() + WINDOW_SECONDS * 1000,
      skipped: true,
    };
  }

  const kv = await getKv();
  if (!kv) {
    return {
      allowed: true,
      limit: LIMIT,
      remaining: LIMIT,
      resetAt: Date.now() + WINDOW_SECONDS * 1000,
      skipped: true,
    };
  }

  const now = Date.now();
  const key = `submit:${ip}`;
  const current = await kv.get<RateLimitState>(key, "json");

  const state =
    !current || current.resetAt < now
      ? { count: 0, resetAt: now + WINDOW_SECONDS * 1000 }
      : current;

  if (state.count >= LIMIT) {
    return {
      allowed: false,
      limit: LIMIT,
      remaining: 0,
      resetAt: state.resetAt,
    };
  }

  const nextState = {
    count: state.count + 1,
    resetAt: state.resetAt,
  };

  await kv.put(key, JSON.stringify(nextState), {
    expirationTtl: WINDOW_SECONDS,
  });

  return {
    allowed: true,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - nextState.count),
    resetAt: nextState.resetAt,
  };
}
