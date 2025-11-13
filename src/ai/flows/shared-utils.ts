/**
 * Shared utilities for AI flows
 * Provides input validation and sanitization to prevent prompt injection
 */

/**
 * Sanitize user input to prevent prompt injection attacks
 * Removes or escapes characters that could be used to manipulate AI prompts
 */
export function sanitizeInput(input: string, maxLength = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);

  // Remove potential prompt injection patterns
  // These patterns could be used to break out of the intended context
  const dangerousPatterns = [
    /\{\{.*?\}\}/g, // Handlebars template syntax
    /\$\{.*?\}/g, // Template literals
    /<script[^>]*>.*?<\/script>/gi, // Script tags
    /<iframe[^>]*>.*?<\/iframe>/gi, // IFrame tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc.)
  ];

  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Replace potentially dangerous characters but keep normal punctuation
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/\\/g, '') // Remove backslashes
    .trim();

  return sanitized;
}

/**
 * Sanitize an array of strings
 */
export function sanitizeArray(arr: string[], maxLength = 500): string[] {
  if (!Array.isArray(arr)) {
    return [];
  }

  return arr
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .map((item) => sanitizeInput(item, maxLength))
    .filter((item) => item.length > 0)
    .slice(0, 20); // Limit array size to prevent abuse
}

/**
 * Validate and sanitize spicy level input
 */
export function validateSpicyLevel(level: string): 'Mild' | 'Medium' | 'Hot' | 'Extra-Hot' {
  const validLevels = ['Mild', 'Medium', 'Hot', 'Extra-Hot'] as const;
  const sanitized = sanitizeInput(level, 20);

  if (validLevels.includes(sanitized as any)) {
    return sanitized as 'Mild' | 'Medium' | 'Hot' | 'Extra-Hot';
  }

  // Default to Mild if invalid
  return 'Mild';
}

/**
 * Validate and sanitize category input
 */
export function validateCategories(categories: string[]): string[] {
  const validCategories = [
    'Emotional Connection',
    'Physical Attraction',
    'Communication',
    'Trust & Vulnerability',
    'Intimacy & Desire',
    'Future Dreams',
    'Past & Present',
    'Playfulness',
  ];

  const sanitized = sanitizeArray(categories, 100);

  // Only return categories that are in the valid list
  return sanitized.filter((cat) =>
    validCategories.some((valid) => valid.toLowerCase() === cat.toLowerCase())
  );
}

/**
 * Create a safe timeout wrapper for AI operations
 */
export async function withAITimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
