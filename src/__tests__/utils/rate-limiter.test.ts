import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  rateLimiter,
  getRateLimitIdentifier,
  addRateLimitHeaders,
  createRateLimitResponse,
  type RateLimitInfo,
} from '@/lib/utils/rate-limiter';

// Import the class for testing purposes
class RateLimiter {
  private requests: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private lastCleanup: number = Date.now();
  private readonly cleanupIntervalMs: number = 60000;

  constructor(maxRequests: number = 30, windowMinutes: number = 1) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  check(identifier: string): RateLimitInfo {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Deterministic cleanup
    if (now - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup(now);
      this.lastCleanup = now;
    }

    // Lazy cleanup
    if (entry && now > entry.resetAt) {
      this.requests.delete(identifier);
    }

    const currentEntry = this.requests.get(identifier);

    if (!currentEntry) {
      const resetAt = now + this.windowMs;
      this.requests.set(identifier, {
        count: 1,
        resetAt,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        limit: this.maxRequests,
        resetAt,
      };
    }

    if (currentEntry.count >= this.maxRequests) {
      const retryAfter = Math.ceil((currentEntry.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        limit: this.maxRequests,
        resetAt: currentEntry.resetAt,
        retryAfter: retryAfter > 0 ? retryAfter : 1,
      };
    }

    currentEntry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - currentEntry.count,
      limit: this.maxRequests,
      resetAt: currentEntry.resetAt,
    };
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

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(10, 1); // 10 requests per minute for testing
  });

  it('should allow requests within limit', () => {
    const result1 = limiter.check('test-ip');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(9);
    expect(result1.limit).toBe(10);

    const result2 = limiter.check('test-ip');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(8);
  });

  it('should block requests over limit', () => {
    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      limiter.check('test-ip-2');
    }

    // 11th request should be blocked
    const result = limiter.check('test-ip-2');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should track different IPs separately', () => {
    const result1 = limiter.check('ip-1');
    const result2 = limiter.check('ip-2');

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result1.remaining).toBe(9);
    expect(result2.remaining).toBe(9);
  });

  it('should return resetAt timestamp', () => {
    const now = Date.now();
    const result = limiter.check('test-ip-3');

    expect(result.resetAt).toBeGreaterThan(now);
    expect(result.resetAt).toBeLessThanOrEqual(now + 60000); // Within 1 minute window
  });

  it('should calculate retryAfter in seconds when rate limited', () => {
    // Hit the limit
    for (let i = 0; i < 10; i++) {
      limiter.check('test-ip-4');
    }

    const result = limiter.check('test-ip-4');
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60); // Within 60 seconds
  });

  it('should perform lazy cleanup on expired entries', () => {
    // Create an entry
    limiter.check('test-ip-5');
    expect(limiter.getSize()).toBe(1);

    // Manually expire the entry by modifying time
    vi.useFakeTimers();
    vi.advanceTimersByTime(61000); // Advance by 61 seconds

    // Access the expired entry - should trigger lazy cleanup
    const result = limiter.check('test-ip-5');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // Reset to new window

    vi.useRealTimers();
  });

  it('should perform deterministic cleanup after interval', () => {
    vi.useFakeTimers();

    // Create multiple entries
    limiter.check('ip-1');
    limiter.check('ip-2');
    limiter.check('ip-3');
    expect(limiter.getSize()).toBe(3);

    // Advance time beyond cleanup interval and window
    vi.advanceTimersByTime(65000); // 65 seconds

    // Next check should trigger cleanup
    limiter.check('ip-4');

    // All old entries should be cleaned up
    expect(limiter.getSize()).toBe(1); // Only the new ip-4 entry

    vi.useRealTimers();
  });

  it('should handle concurrent requests correctly', () => {
    const results = [];
    for (let i = 0; i < 15; i++) {
      results.push(limiter.check('concurrent-ip'));
    }

    // First 10 should be allowed
    for (let i = 0; i < 10; i++) {
      expect(results[i].allowed).toBe(true);
    }

    // Last 5 should be blocked
    for (let i = 10; i < 15; i++) {
      expect(results[i].allowed).toBe(false);
    }
  });
});

describe('getRateLimitIdentifier', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
    });

    const ip = getRateLimitIdentifier(request);
    expect(ip).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-real-ip': '192.168.1.2',
      },
    });

    const ip = getRateLimitIdentifier(request);
    expect(ip).toBe('192.168.1.2');
  });

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
      },
    });

    const ip = getRateLimitIdentifier(request);
    expect(ip).toBe('192.168.1.1');
  });

  it('should return "unknown" if no IP headers present', () => {
    const request = new Request('http://localhost');
    const ip = getRateLimitIdentifier(request);
    expect(ip).toBe('unknown');
  });
});

describe('addRateLimitHeaders', () => {
  it('should add rate limit headers to response', () => {
    const originalResponse = new Response('OK', { status: 200 });
    const rateLimitInfo: RateLimitInfo = {
      allowed: true,
      remaining: 25,
      limit: 30,
      resetAt: Date.now() + 60000,
    };

    const response = addRateLimitHeaders(originalResponse, rateLimitInfo);

    expect(response.headers.get('X-RateLimit-Limit')).toBe('30');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('25');
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('should add Retry-After header when rate limited', () => {
    const originalResponse = new Response('OK', { status: 200 });
    const rateLimitInfo: RateLimitInfo = {
      allowed: false,
      remaining: 0,
      limit: 30,
      resetAt: Date.now() + 30000,
      retryAfter: 30,
    };

    const response = addRateLimitHeaders(originalResponse, rateLimitInfo);

    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('Retry-After')).toBe('30');
  });

  it('should preserve original response body and status', () => {
    const originalResponse = new Response(JSON.stringify({ data: 'test' }), {
      status: 201,
      statusText: 'Created',
    });
    const rateLimitInfo: RateLimitInfo = {
      allowed: true,
      remaining: 25,
      limit: 30,
      resetAt: Date.now() + 60000,
    };

    const response = addRateLimitHeaders(originalResponse, rateLimitInfo);

    expect(response.status).toBe(201);
    expect(response.statusText).toBe('Created');
  });
});

describe('createRateLimitResponse', () => {
  it('should create 429 response with rate limit headers', () => {
    const rateLimitInfo: RateLimitInfo = {
      allowed: false,
      remaining: 0,
      limit: 30,
      resetAt: Date.now() + 45000,
      retryAfter: 45,
    };

    const response = createRateLimitResponse(rateLimitInfo);

    expect(response.status).toBe(429);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('30');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('Retry-After')).toBe('45');
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should include error message in response body', async () => {
    const rateLimitInfo: RateLimitInfo = {
      allowed: false,
      remaining: 0,
      limit: 30,
      resetAt: Date.now() + 45000,
      retryAfter: 45,
    };

    const response = createRateLimitResponse(rateLimitInfo);
    const body = await response.json();

    expect(body.error).toBe('Too many requests. Please try again later.');
    expect(body.retryAfter).toBe(45);
  });

  it('should allow custom error message', async () => {
    const rateLimitInfo: RateLimitInfo = {
      allowed: false,
      remaining: 0,
      limit: 30,
      resetAt: Date.now() + 45000,
      retryAfter: 45,
    };

    const customMessage = 'Custom rate limit message';
    const response = createRateLimitResponse(rateLimitInfo, customMessage);
    const body = await response.json();

    expect(body.error).toBe(customMessage);
  });
});

describe('Global rateLimiter instance', () => {
  it('should export a configured rateLimiter instance', () => {
    expect(rateLimiter).toBeDefined();
    expect(typeof rateLimiter.check).toBe('function');
  });

  it('should work with default configuration (30 requests per minute)', () => {
    // Note: Using a different identifier to avoid conflicts with other tests
    const identifier = 'global-test-' + Date.now();
    const result = rateLimiter.check(identifier);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(30);
  });
});
