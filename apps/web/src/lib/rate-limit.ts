/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-instance / edge prototypes.
 *
 * Multi-instance: set REDIS_URL and prefer `rateLimitRedis` from
 * `rate-limit-redis.ts` (stub today; wire ioredis when ready). Until then,
 * this memory store is the active path.
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

const DEFAULT_WINDOW_MS = 60_000;

function prune(entry: WindowEntry, windowStart: number): void {
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
}

/**
 * Check (and record) a request against a sliding window.
 *
 * @param key Unique bucket key (e.g. user id or IP)
 * @param limit Max requests allowed in the window
 * @param windowMs Window length in milliseconds (default 60s)
 */
export function rateLimit(
  key: string,
  limit = Number(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE ?? 60),
  windowMs = DEFAULT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  prune(entry, windowStart);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0] ?? now;
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  entry.timestamps.push(now);

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - entry.timestamps.length),
    resetAt: now + windowMs,
  };
}

/** Clear all buckets (tests / hot reload hygiene). */
export function resetRateLimitStore(): void {
  store.clear();
}
