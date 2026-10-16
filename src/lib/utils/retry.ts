const NON_RETRYABLE_CODES = new Set([
  '23505', // unique_violation
  '23514', // check_violation
  '23502', // not_null_violation
  '22P02', // invalid_text_representation
]);

/**
 * Errors may declare themselves terminal by carrying `retryable: false`.
 *
 * Retrying is only ever worth it for a failure that might not recur. A
 * deterministic refusal — an authorization decision, say — returns the same
 * answer every time, so retrying it just multiplies transactions, log noise and
 * latency before producing the identical result.
 */
function isExplicitlyNonRetryable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'retryable' in error &&
    (error as { retryable?: unknown }).retryable === false
  );
}

function defaultShouldRetry(error: unknown): boolean {
  if (isExplicitlyNonRetryable(error)) {
    return false;
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code ?? '');
    if (NON_RETRYABLE_CODES.has(code)) {
      return false;
    }
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    if (
      errorMessage.includes('duplicate') ||
      errorMessage.includes('constraint') ||
      errorMessage.includes('invalid')
    ) {
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
