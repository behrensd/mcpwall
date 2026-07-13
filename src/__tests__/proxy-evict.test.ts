/**
 * Tests for evictOldestIfFull — bounds the pendingRequests correlation map
 */

import { describe, it, expect } from 'vitest';
import { evictOldestIfFull } from '../proxy';

describe('evictOldestIfFull', () => {
  it('does nothing when the map is below capacity', () => {
    const m = new Map<number, string>([[1, 'a'], [2, 'b']]);
    evictOldestIfFull(m, 10);
    expect(m.size).toBe(2);
    expect(m.has(1)).toBe(true);
  });

  it('evicts the oldest (first-inserted) entry when at capacity', () => {
    const m = new Map<number, string>([[1, 'a'], [2, 'b'], [3, 'c']]);
    evictOldestIfFull(m, 3);
    expect(m.size).toBe(2);
    expect(m.has(1)).toBe(false); // oldest gone
    expect(m.has(3)).toBe(true);
  });

  it('keeps the map bounded across many insertions past the cap', () => {
    const m = new Map<number, number>();
    const MAX = 100;
    for (let i = 0; i < MAX + 500; i++) {
      evictOldestIfFull(m, MAX);
      m.set(i, i);
    }
    expect(m.size).toBe(MAX);
    // The oldest surviving key is the most recent MAX inserts
    expect(m.has(MAX + 500 - 1)).toBe(true); // newest present
    expect(m.has(0)).toBe(false); // earliest evicted
  });
});
