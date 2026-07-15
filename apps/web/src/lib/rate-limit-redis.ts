/**
 * Redis-backed rate limit adapter (optional).
 *
 * Production multi-instance deployments should set REDIS_URL and wire this
 * module from `rate-limit.ts` / `api.ts`. This stub intentionally avoids an
 * `ioredis` dependency: when REDIS_URL is unset (or Redis is unavailable),
 * callers keep using the in-memory limiter.
 *
 * To enable later:
 * 1. `pnpm --filter @nexa/web add ioredis`
 * 2. Implement `rateLimitRedis` with a sliding window / token bucket
 * 3. Swap `rateLimit` / `rateLimitByIp` to prefer Redis when configured
 */

import type { RateLimitResult } from "@/lib/rate-limit";
import { rateLimit } from "@/lib/rate-limit";

export function isRedisRateLimitConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

/**
 * Attempt Redis-backed limiting. Today this always falls back to memory so
 * the app stays dependency-light until ioredis is installed and wired.
 */
export async function rateLimitRedis(
  key: string,
  limit?: number,
  windowMs?: number,
): Promise<RateLimitResult> {
  if (!isRedisRateLimitConfigured()) {
    return rateLimit(key, limit, windowMs);
  }

  // Stub: dynamic import placeholder for future ioredis integration.
  // Example:
  //   const Redis = (await import("ioredis")).default;
  //   const client = new Redis(process.env.REDIS_URL!);
  //   ... INCR + PEXPIRE sliding window ...
  return rateLimit(key, limit, windowMs);
}
