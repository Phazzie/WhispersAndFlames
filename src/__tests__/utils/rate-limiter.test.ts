import { describe, it, expect } from 'vitest';

class RateLimiter {
  private requests: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 30, windowMinutes: number = 1) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  check(identifier: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

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
}

describe('rate limiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new RateLimiter();

    const result1 = limiter.check('test-ip');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(29);

    const result2 = limiter.check('test-ip');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(28);
  });

  it('should block requests over limit', () => {
    const limiter = new RateLimiter();

    // Make 30 requests
    for (let i = 0; i < 30; i++) {
      limiter.check('test-ip-2');
    }

    // 31st request should be blocked
    const result = limiter.check('test-ip-2');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track different IPs separately', () => {
    const limiter = new RateLimiter();

    const result1 = limiter.check('ip-1');
    const result2 = limiter.check('ip-2');

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result1.remaining).toBe(29);
    expect(result2.remaining).toBe(29);
  });

  it('should extract IP from headers', async () => {
    const { getRateLimitIdentifier } = await import('@/lib/utils/rate-limiter');

    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
    });

    const ip = getRateLimitIdentifier(request);
    expect(ip).toBe('192.168.1.1');
  });
});
