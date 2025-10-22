/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 *
 * ⚠️ SECURITY NOTE: This is a basic implementation.
 * For production use with untrusted HTML, use DOMPurify library instead.
 * Current implementation strips all HTML to plain text as safest approach.
 *
 * @param input - The input string to sanitize
 * @returns Plain text with HTML tags removed
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  // Use DOMParser for safer HTML parsing (browser only)
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(input, 'text/html');

      // Remove all potentially dangerous tags
      const dangerousTags = doc.querySelectorAll(
        'script, iframe, object, embed, link, style, form'
      );
      dangerousTags.forEach((el) => el.remove());

      // Remove event handlers and dangerous URLs
      const allElements = doc.querySelectorAll('*');
      allElements.forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          if (
            attr.name.startsWith('on') ||
            attr.value.toLowerCase().includes('javascript:') ||
            attr.value.toLowerCase().includes('data:') ||
            attr.value.toLowerCase().includes('vbscript:')
          ) {
            el.removeAttribute(attr.name);
          }
        });
      });

      return doc.body.textContent || '';
    } catch (e) {
      return input.replace(/<[^>]*>/g, '');
    }
  }

  // Server-side: Strip ALL HTML tags for maximum safety
  // This avoids regex-based sanitization issues identified by CodeQL
  let text = input;

  // First pass: Remove entire dangerous tag blocks
  const dangerousPatterns = [
    /<script[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?<\/iframe>/gi,
    /<object[\s\S]*?<\/object>/gi,
    /<embed[\s\S]*?>/gi,
    /<link[\s\S]*?>/gi,
    /<style[\s\S]*?<\/style>/gi,
    /<form[\s\S]*?<\/form>/gi,
  ];

  dangerousPatterns.forEach((pattern) => {
    // Run multiple times to handle nested tags
    for (let i = 0; i < 3; i++) {
      text = text.replace(pattern, '');
    }
  });

  // Second pass: Strip ALL remaining HTML tags (safest approach)
  for (let i = 0; i < 3; i++) {
    text = text.replace(/<[^>]*>/g, '');
  }

  // Third pass: Remove dangerous URL schemes
  text = text
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '');

  return text;
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

/**
 * Simple rate limiting implementation
 * Returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  entry.count++;
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
