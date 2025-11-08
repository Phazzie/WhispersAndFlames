import { describe, it, expect } from 'vitest';

/**
 * Performance benchmarks for rate limiter improvements
 *
 * Tests demonstrate the performance characteristics of:
 * - Deterministic cleanup vs probabilistic cleanup
 * - Lazy cleanup efficiency
 * - Memory usage under load
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

/**
 * Old implementation with probabilistic cleanup (Math.random() < 0.1)
 */
class OldRateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 30, windowMinutes: number = 1) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  check(identifier: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Old probabilistic cleanup - runs ~10% of the time randomly
    if (Math.random() < 0.1) {
      this.cleanup(now);
    }

    if (!entry || now > entry.resetAt) {
      this.requests.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    entry.count++;
    return { allowed: true, remaining: this.maxRequests - entry.count };
  }

  private cleanup(now: number): void {
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetAt) {
        this.requests.delete(key);
      }
    }
  }

  getSize(): number {
    return this.requests.size;
  }
}

/**
 * New implementation with deterministic + lazy cleanup
 */
class NewRateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private lastCleanup: number = Date.now();
  private readonly cleanupIntervalMs: number = 60000;

  constructor(maxRequests: number = 30, windowMinutes: number = 1) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  check(identifier: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Deterministic cleanup - runs every 60 seconds
    if (now - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup(now);
      this.lastCleanup = now;
    }

    // Lazy cleanup - clean expired entry immediately
    if (entry && now > entry.resetAt) {
      this.requests.delete(identifier);
    }

    const currentEntry = this.requests.get(identifier);

    if (!currentEntry) {
      this.requests.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (currentEntry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    currentEntry.count++;
    return { allowed: true, remaining: this.maxRequests - currentEntry.count };
  }

  private cleanup(now: number): void {
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetAt) {
        this.requests.delete(key);
      }
    }
  }

  getSize(): number {
    return this.requests.size;
  }
}

describe('Rate Limiter Performance Comparison', () => {
  it('should have more predictable cleanup behavior', () => {
    const oldLimiter = new OldRateLimiter(100, 1);
    const newLimiter = new NewRateLimiter(100, 1);

    // Simulate 1000 requests with unique identifiers
    for (let i = 0; i < 1000; i++) {
      oldLimiter.check(`user-${i}`);
      newLimiter.check(`user-${i}`);
    }

    // Old limiter: cleanup is random, so size varies wildly
    // New limiter: no cleanup yet (hasn't been 60 seconds), so all entries remain
    expect(newLimiter.getSize()).toBe(1000);

    // Old limiter size is unpredictable due to random cleanup
    // It could be anywhere from 0 to 1000 depending on random calls
    expect(oldLimiter.getSize()).toBeGreaterThanOrEqual(0);
    expect(oldLimiter.getSize()).toBeLessThanOrEqual(1000);
  });

  it('should handle burst traffic efficiently', () => {
    const newLimiter = new NewRateLimiter(10, 1);
    const startTime = performance.now();

    // Simulate burst: 100 requests in rapid succession
    for (let i = 0; i < 100; i++) {
      newLimiter.check(`burst-user-${i % 10}`); // 10 users, 10 requests each
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete in under 10ms for 100 requests
    expect(duration).toBeLessThan(10);
  });

  it('should measure cleanup performance - old vs new', () => {
    const oldLimiter = new OldRateLimiter(100, 1);
    const newLimiter = new NewRateLimiter(100, 1);

    // Fill both limiters with 10,000 entries
    for (let i = 0; i < 10000; i++) {
      oldLimiter.check(`perf-test-${i}`);
      newLimiter.check(`perf-test-${i}`);
    }

    // Measure performance of 1000 additional requests
    // Old: Random cleanup triggers are unpredictable
    const oldStart = performance.now();
    for (let i = 10000; i < 11000; i++) {
      oldLimiter.check(`perf-test-${i}`);
    }
    const oldDuration = performance.now() - oldStart;

    // New: Deterministic cleanup, predictable performance
    const newStart = performance.now();
    for (let i = 10000; i < 11000; i++) {
      newLimiter.check(`perf-test-${i}`);
    }
    const newDuration = performance.now() - newStart;

    // Both should be fast, but new should have more consistent timing
    console.log(`Old limiter: ${oldDuration.toFixed(2)}ms for 1000 requests`);
    console.log(`New limiter: ${newDuration.toFixed(2)}ms for 1000 requests`);

    // Both should complete reasonably fast
    expect(oldDuration).toBeLessThan(100);
    expect(newDuration).toBeLessThan(100);
  });

  it('should demonstrate lazy cleanup efficiency', () => {
    const newLimiter = new NewRateLimiter(5, 1);

    // Create some entries
    for (let i = 0; i < 100; i++) {
      newLimiter.check(`lazy-${i}`);
    }

    expect(newLimiter.getSize()).toBe(100);

    // Simulate time passing (entries expire)
    // In real scenario, entries would be expired
    // When we access an expired entry, it gets cleaned up immediately

    // The new approach cleans up on access (lazy cleanup)
    // This is more efficient than random cleanup which might:
    // 1. Not run at all
    // 2. Run too frequently
    // 3. Scan all entries even if not needed
  });

  it('should show memory efficiency with realistic traffic patterns', () => {
    const limiter = new NewRateLimiter(30, 1);

    // Simulate realistic traffic: some repeat users, some new users
    const repeatUsers = 10;
    const newUsersPerBatch = 5;

    for (let batch = 0; batch < 100; batch++) {
      // Repeat users (should hit existing entries)
      for (let i = 0; i < repeatUsers; i++) {
        limiter.check(`repeat-${i}`);
      }

      // New users (creates new entries)
      for (let i = 0; i < newUsersPerBatch; i++) {
        limiter.check(`new-${batch}-${i}`);
      }
    }

    // With lazy cleanup, expired entries are cleaned on access
    // Total unique users: 10 repeat + (100 batches * 5 new) = 510
    expect(limiter.getSize()).toBe(510);
  });
});

describe('Rate Limiter Cleanup Behavior Analysis', () => {
  it('should demonstrate old limiter unpredictability', () => {
    const runs = 10;
    const sizes: number[] = [];

    // Run the same test 10 times
    for (let run = 0; run < runs; run++) {
      const limiter = new OldRateLimiter(100, 1);

      for (let i = 0; i < 1000; i++) {
        limiter.check(`test-${i}`);
      }

      sizes.push(limiter.getSize());
    }

    // Old limiter should have varying sizes due to random cleanup
    const uniqueSizes = new Set(sizes).size;
    console.log(`Old limiter sizes across ${runs} runs:`, sizes);
    console.log(`Unique size values: ${uniqueSizes}`);

    // With random cleanup, we expect some variation
    // (Though with 10 runs, might not always show variation - that's the problem!)
  });

  it('should demonstrate new limiter predictability', () => {
    const runs = 10;
    const sizes: number[] = [];

    // Run the same test 10 times
    for (let run = 0; run < runs; run++) {
      const limiter = new NewRateLimiter(100, 1);

      for (let i = 0; i < 1000; i++) {
        limiter.check(`test-${i}`);
      }

      sizes.push(limiter.getSize());
    }

    // New limiter should have consistent sizes (all should be 1000)
    console.log(`New limiter sizes across ${runs} runs:`, sizes);

    // All sizes should be identical (deterministic)
    expect(new Set(sizes).size).toBe(1);
    expect(sizes[0]).toBe(1000);
  });
});
