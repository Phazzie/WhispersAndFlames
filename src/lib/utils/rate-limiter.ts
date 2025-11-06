type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitInfo = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter?: number;
};

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private lastCleanup: number = Date.now();
  private readonly cleanupIntervalMs: number = 60000; // Cleanup every 60 seconds

  constructor(maxRequests: number = 30, windowMinutes: number = 1) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  check(identifier: string): RateLimitInfo {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Deterministic cleanup: Run cleanup if enough time has passed since last cleanup
    // This replaces the inefficient Math.random() < 0.1 approach
    if (now - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup(now);
      this.lastCleanup = now;
    }

    // Lazy cleanup: If the specific entry is expired, clean it immediately
    if (entry && now > entry.resetAt) {
      this.requests.delete(identifier);
    }

    const currentEntry = this.requests.get(identifier);

    if (!currentEntry) {
      // New window
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

  // Get current map size for monitoring/testing
  getSize(): number {
    return this.requests.size;
  }
}

// Single instance for the entire app (in-memory)
export const rateLimiter = new RateLimiter(30, 1);

export function getRateLimitIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  return ip;
}

/**
 * Adds standard rate limit headers to a Response object
 * Headers added:
 * - X-RateLimit-Limit: Maximum requests allowed in the window
 * - X-RateLimit-Remaining: Remaining requests in the current window
 * - X-RateLimit-Reset: Unix timestamp when the rate limit window resets
 * - Retry-After: (Only on 429 responses) Seconds until client can retry
 *
 * @param response - The Response object to add headers to
 * @param rateLimitInfo - Rate limit information from the rate limiter
 * @returns The Response object with added headers
 */
export function addRateLimitHeaders(response: Response, rateLimitInfo: RateLimitInfo): Response {
  const headers = new Headers(response.headers);

  // Add standard rate limit headers
  headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
  headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  headers.set('X-RateLimit-Reset', Math.floor(rateLimitInfo.resetAt / 1000).toString());

  // Add Retry-After header if rate limited
  if (!rateLimitInfo.allowed && rateLimitInfo.retryAfter) {
    headers.set('Retry-After', rateLimitInfo.retryAfter.toString());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Creates a 429 Too Many Requests response with rate limit headers
 * Use this when a request is blocked by the rate limiter
 *
 * @param rateLimitInfo - Rate limit information from the rate limiter
 * @param message - Optional custom error message
 * @returns A 429 Response with appropriate headers
 */
export function createRateLimitResponse(
  rateLimitInfo: RateLimitInfo,
  message: string = 'Too many requests. Please try again later.'
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': Math.floor(rateLimitInfo.resetAt / 1000).toString(),
  });

  if (rateLimitInfo.retryAfter) {
    headers.set('Retry-After', rateLimitInfo.retryAfter.toString());
  }

  return new Response(
    JSON.stringify({
      error: message,
      retryAfter: rateLimitInfo.retryAfter,
    }),
    {
      status: 429,
      headers,
    }
  );
}
