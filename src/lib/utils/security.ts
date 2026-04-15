/**
 * Security utilities for input sanitization and validation
 */

import sanitizeHtmlLib from 'sanitize-html';

/**
 * Sanitizes user input to prevent XSS attacks.
 * Uses the sanitize-html library with no allowed tags or attributes,
 * which strips all HTML and returns safe plain text.
 *
 * @param input - The input string to sanitize
 * @returns Plain text with all HTML tags and attributes removed
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  return sanitizeHtmlLib(input, { allowedTags: [], allowedAttributes: {} });
}

/**
 * Escapes special characters for safe HTML display
 */
export function escapeHtml(input: string): string {
  if (!input) return '';

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Validates and sanitizes file paths to prevent path traversal
 */
export function sanitizePath(path: string): string {
  if (!path) return '';

  // Remove path traversal attempts
  return path.replace(/\.\./g, '').replace(/\/\//g, '/').replace(/\\/g, '');
}

/**
 * Generates a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates email format (basic validation)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if a string contains only safe characters
 */
export function isSafeString(input: string): boolean {
  // Allow alphanumeric, spaces, and common punctuation
  const safePattern = /^[a-zA-Z0-9\s.,!?'"()\-_@#$%&*+=:;/<>[\]{}|\\~`]+$/;
  return safePattern.test(input);
}

/**
 * Truncates string to prevent DoS via large inputs
 */
export function truncateInput(input: string, maxLength: number = 10000): string {
  return input.length > maxLength ? input.substring(0, maxLength) : input;
}

/**
 * Rate limit check data structure
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();
const cleanupIntervalMs = 60000; // Cleanup every 60 seconds

/**
 * Simple rate limiting implementation with deterministic cleanup
 * Returns true if request should be allowed, false if rate limited
 *
 * Changes from previous version:
 * - Replaced Math.random() < 0.01 with deterministic time-based cleanup
 * - Added lazy cleanup for expired entries on access
 * - Cleanup now runs every 60 seconds instead of probabilistically
 *
 * @param identifier - Unique identifier for the client (e.g., IP address)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Deterministic cleanup: Run cleanup if enough time has passed since last cleanup
  // This replaces the inefficient Math.random() < 0.01 approach
  if (now - lastCleanup > cleanupIntervalMs) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
    lastCleanup = now;
  }

  // Lazy cleanup: If the specific entry is expired, clean it immediately
  if (entry && entry.resetTime < now) {
    rateLimitStore.delete(identifier);
  }

  const currentEntry = rateLimitStore.get(identifier);

  if (!currentEntry) {
    // Create new entry or reset expired entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (currentEntry.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  currentEntry.count++;
  return true;
}

/**
 * Get client IP from request headers (for rate limiting)
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}
