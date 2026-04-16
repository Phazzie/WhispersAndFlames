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

  let decodedPath = path;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    return '';
  }

  // Remove path traversal attempts
  return decodedPath.replace(/\.\./g, '').replace(/\/\//g, '/').replace(/\\/g, '');
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

// NOTE: Rate limiting helpers were moved to /lib/utils/rate-limiter.ts
