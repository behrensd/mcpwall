/**
 * Tests for RateLimiter — per-key token bucket
 */

import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../engine/rate-limiter';

describe('RateLimiter', () => {
  it('allows calls up to max_calls within the window', () => {
    const rl = new RateLimiter({ max_calls: 3, window_seconds: 60 });
    const now = 1000;
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(false); // 4th call, same instant
  });

  it('tracks separate buckets per key', () => {
    const rl = new RateLimiter({ max_calls: 1, window_seconds: 60 });
    const now = 1000;
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(false);
    expect(rl.tryConsume('toolB', now)).toBe(true); // different key, fresh bucket
  });

  it('refills tokens proportionally over time', () => {
    const rl = new RateLimiter({ max_calls: 10, window_seconds: 10 }); // 1 token/sec
    let now = 0;
    for (let i = 0; i < 10; i++) expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(false); // exhausted

    now += 5000; // 5s later → 5 tokens refilled
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(false); // only 5 refilled
  });

  it('never refills above capacity', () => {
    const rl = new RateLimiter({ max_calls: 2, window_seconds: 1 });
    let now = 0;
    expect(rl.tryConsume('toolA', now)).toBe(true);
    now += 60_000; // long idle period
    // Capacity caps at 2, not unboundedly accumulated
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(true);
    expect(rl.tryConsume('toolA', now)).toBe(false);
  });
});
