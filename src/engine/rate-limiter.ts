/**
 * Token bucket rate limiter, keyed per tool name.
 * Deterministic and dependency-free, consistent with mcpwall's
 * "no AI, no cloud, pure rules" design.
 */

export interface RateLimitConfig {
  max_calls: number;
  window_seconds: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private readonly capacity: number;
  private readonly refillPerMs: number;

  constructor(config: RateLimitConfig) {
    this.capacity = config.max_calls;
    this.refillPerMs = config.max_calls / (config.window_seconds * 1000);
  }

  /**
   * Attempt to consume one token for `key`. Returns true and consumes a
   * token if the bucket has capacity; returns false (no consumption) if the
   * caller is currently rate-limited. `now` is injectable for tests.
   */
  tryConsume(key: string, now: number = Date.now()): boolean {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    } else {
      const elapsedMs = Math.max(0, now - bucket.lastRefill);
      bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedMs * this.refillPerMs);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }
}
