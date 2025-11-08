/**
 * CSRF (Cross-Site Request Forgery) protection utilities
 * Implements Double Submit Cookie pattern for CSRF protection
 */

import { generateSecureToken } from './security';
import {
  opportunisticCleanup,
  isTimestampExpired,
  shouldCleanup,
} from './cleanup';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_LIFETIME = 3600000; // 1 hour in milliseconds

interface CsrfTokenEntry {
  token: string;
  createdAt: number;
}

// In-memory store for CSRF tokens
// Note: In serverless environments (like Vercel), this map is per-instance
// For production with multiple instances, consider using Vercel KV or database storage
const csrfTokenStore = new Map<string, CsrfTokenEntry>();

/**
 * Generates a new CSRF token for a session
 */
export function generateCsrfToken(sessionId: string): string {
  // Opportunistic cleanup (10% chance) - serverless-compatible
  if (shouldCleanup()) {
    opportunisticCleanup(csrfTokenStore, (entry) =>
      isTimestampExpired(entry.createdAt, CSRF_TOKEN_LIFETIME)
    );
  }

  const token = generateSecureToken(CSRF_TOKEN_LENGTH);
  csrfTokenStore.set(sessionId, {
    token,
    createdAt: Date.now(),
  });
  return token;
}

/**
 * Validates a CSRF token for a session
 * Returns true if valid, false otherwise
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  const entry = csrfTokenStore.get(sessionId);

  if (!entry) {
    return false;
  }

  // Check if token has expired
  if (Date.now() - entry.createdAt > CSRF_TOKEN_LIFETIME) {
    csrfTokenStore.delete(sessionId);
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(entry.token, token);
}

/**
 * Deletes CSRF token for a session (on logout)
 */
export function deleteCsrfToken(sessionId: string): void {
  csrfTokenStore.delete(sessionId);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Extracts CSRF token from request headers
 */
export function getCsrfTokenFromRequest(request: Request): string | null {
  return request.headers.get('x-csrf-token');
}
