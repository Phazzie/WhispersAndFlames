const NON_RETRYABLE_CODES = new Set([
  '23505', // unique_violation
  '23514', // check_violation
  '23502', // not_null_violation
  '22P02', // invalid_text_representation
]);

function defaultShouldRetry(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code ?? '');
    if (NON_RETRYABLE_CODES.has(code)) {
      return false;
    }
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    // Only block retries for messages that clearly indicate a permanent DB constraint error.
    // Avoid matching "invalid" here because application-level validation errors (e.g. AI
    // responses that are too short/long) contain "invalid" and ARE transient — they should
    // be retried. DB-level "invalid" errors are already caught via NON_RETRYABLE_CODES above.
    if (errorMessage.includes('duplicate') || errorMessage.includes('constraint')) {
      return false;
    }
  }

  return true;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 100,
  shouldRetry: (error: unknown) => boolean = defaultShouldRetry
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error)) {
        throw error;
      }

      if (attempt === maxAttempts - 1) {
        throw error;
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Retry operation failed');
}
