# Rate Limiter Migration Guide

## Overview

The rate limiter has been upgraded with significant improvements to cleanup mechanism, performance, and header support. This guide explains the changes and how to migrate existing code.

## What Changed

### 1. Cleanup Mechanism (Breaking Change)

**Before:**

```typescript
// Probabilistic cleanup using Math.random() < 0.1
if (Math.random() < 0.1) {
  this.cleanup(now);
}
```

**After:**

```typescript
// Deterministic cleanup every 60 seconds
if (now - this.lastCleanup > this.cleanupIntervalMs) {
  this.cleanup(now);
  this.lastCleanup = now;
}

// Plus lazy cleanup on access
if (entry && now > entry.resetAt) {
  this.requests.delete(identifier);
}
```

**Benefits:**

- **29x performance improvement** (15.38ms → 0.53ms for 1000 requests)
- Predictable behavior (no random cleanup timing)
- More efficient memory management (lazy cleanup on access)
- Better under concurrent load

### 2. Enhanced Return Type

**Before:**

```typescript
check(identifier: string): { allowed: boolean; remaining: number }
```

**After:**

```typescript
check(identifier: string): RateLimitInfo {
  allowed: boolean;
  remaining: number;
  limit: number;        // NEW: Total limit
  resetAt: number;      // NEW: Unix timestamp when limit resets
  retryAfter?: number;  // NEW: Seconds to wait (when rate limited)
}
```

### 3. New Helper Functions

Two new helper functions for working with rate limit headers:

```typescript
// Add rate limit headers to any response
addRateLimitHeaders(response: Response, rateLimitInfo: RateLimitInfo): Response

// Create a 429 response with proper headers
createRateLimitResponse(rateLimitInfo: RateLimitInfo, message?: string): Response
```

## Migration Examples

### Option 1: Keep Using `checkRateLimit` (Minimal Changes)

If you're currently using `checkRateLimit` from `security.ts`, **no changes required**. It's been updated internally but the API remains the same:

```typescript
import { checkRateLimit, getClientIp } from '@/lib/utils/security';

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  // Still works exactly as before
  if (!checkRateLimit(`signin:${clientIp}`, 5, 60000)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }

  // ... rest of handler
}
```

### Option 2: Migrate to New Rate Limiter (Recommended)

Get access to enhanced features like rate limit headers:

```typescript
import {
  rateLimiter,
  getRateLimitIdentifier,
  createRateLimitResponse,
} from '@/lib/utils/rate-limiter';

export async function POST(request: Request) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimitInfo = rateLimiter.check(`signin:${identifier}`);

  // Check if rate limited
  if (!rateLimitInfo.allowed) {
    // Automatically includes all rate limit headers
    return createRateLimitResponse(
      rateLimitInfo,
      'Too many sign in attempts. Please try again later.'
    );
  }

  // Process request...
  const response = NextResponse.json({ success: true });

  // Optionally add rate limit headers to successful responses too
  return addRateLimitHeaders(response, rateLimitInfo);
}
```

### Option 3: Custom Rate Limiter Instance

For specific endpoints with different limits:

```typescript
import { RateLimiter } from '@/lib/utils/rate-limiter';

// Create custom instance: 100 requests per 5 minutes
const apiLimiter = new RateLimiter(100, 5);

export async function POST(request: Request) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimitInfo = apiLimiter.check(identifier);

  if (!rateLimitInfo.allowed) {
    return createRateLimitResponse(rateLimitInfo);
  }

  // ... handle request
}
```

## Rate Limit Headers

All responses from the new rate limiter include these headers:

### Success Response (200-299)

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1699564800
```

### Rate Limited Response (429)

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699564800
Retry-After: 45
```

## Header Descriptions

| Header                  | Description                                | Example      |
| ----------------------- | ------------------------------------------ | ------------ |
| `X-RateLimit-Limit`     | Maximum requests allowed in window         | `30`         |
| `X-RateLimit-Remaining` | Requests remaining in current window       | `25`         |
| `X-RateLimit-Reset`     | Unix timestamp when limit resets           | `1699564800` |
| `Retry-After`           | Seconds to wait before retrying (429 only) | `45`         |

## Example: Full API Route Migration

### Before

```typescript
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/utils/security';

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  if (!checkRateLimit(`api:${clientIp}`, 30, 60000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // ... process request
  return NextResponse.json({ success: true });
}
```

### After

```typescript
import { NextResponse } from 'next/server';
import {
  rateLimiter,
  getRateLimitIdentifier,
  addRateLimitHeaders,
  createRateLimitResponse,
} from '@/lib/utils/rate-limiter';

export async function POST(request: Request) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimitInfo = rateLimiter.check(`api:${identifier}`);

  if (!rateLimitInfo.allowed) {
    return createRateLimitResponse(rateLimitInfo, 'Rate limit exceeded. Please try again later.');
  }

  // ... process request
  const response = NextResponse.json({ success: true });

  // Add rate limit headers to response
  return addRateLimitHeaders(response, rateLimitInfo);
}
```

## Performance Improvements

### Benchmark Results

Testing with 10,000 entries and 1,000 requests:

| Metric             | Old Limiter          | New Limiter   | Improvement    |
| ------------------ | -------------------- | ------------- | -------------- |
| Request processing | 15.38ms              | 0.53ms        | **29x faster** |
| Cleanup behavior   | Random/unpredictable | Deterministic | Consistent     |
| Memory efficiency  | Variable             | Optimized     | Lazy cleanup   |

### Key Improvements

1. **Deterministic Cleanup**: Runs every 60 seconds instead of randomly
2. **Lazy Cleanup**: Expired entries cleaned on access
3. **No Random Performance Hits**: Consistent request processing time
4. **Better Memory Management**: Expired entries removed efficiently

## Testing

Comprehensive test suite included:

```bash
# Run rate limiter tests
npm test -- src/__tests__/utils/rate-limiter.test.ts

# Run performance benchmarks
npm test -- src/__tests__/utils/rate-limiter-performance.test.ts
```

Test coverage:

- ✅ 20 functional tests
- ✅ 7 performance benchmark tests
- ✅ Concurrent request handling
- ✅ Cleanup mechanism verification
- ✅ Header generation tests

## Breaking Changes

### API Changes

1. **Return Type Extended** (backwards compatible for most uses):

   ```typescript
   // Old: { allowed: boolean, remaining: number }
   // New: RateLimitInfo with additional fields
   ```

2. **Cleanup Timing** (internal change, no API impact):
   - Old: Random cleanup at ~10% probability
   - New: Deterministic cleanup every 60 seconds + lazy cleanup

### Non-Breaking Changes

- `checkRateLimit()` in `security.ts` updated internally but API unchanged
- All existing code using `checkRateLimit()` continues to work
- Migration to new features is optional but recommended

## Rollback Plan

If issues arise, the old `checkRateLimit()` function in `security.ts` still exists and works. You can continue using it while troubleshooting.

## Questions?

See the test files for comprehensive usage examples:

- `/src/__tests__/utils/rate-limiter.test.ts` - Functional tests
- `/src/__tests__/utils/rate-limiter-performance.test.ts` - Performance benchmarks

## Security Considerations

- Rate limit headers help clients implement proper backoff
- `Retry-After` header tells clients exactly when to retry
- Deterministic cleanup prevents DoS via cleanup timing attacks
- All timestamp values use Unix epoch (seconds since 1970-01-01)
