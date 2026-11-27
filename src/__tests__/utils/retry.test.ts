import { describe, expect, it, vi } from 'vitest';

import { withRetry } from '@/lib/utils/retry';

describe('withRetry', () => {
  it('returns value on first success', async () => {
    const operation = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(operation, 3, 1);

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on transient failures and eventually succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce('done');

    const result = await withRetry(operation, 3, 1);
    expect(result).toBe('done');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('always fail'));
    await expect(withRetry(operation, 2, 1)).rejects.toThrow('always fail');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry known non-retryable error codes', async () => {
    const error = Object.assign(new Error('db constraint failed'), { code: '23505' });
    const operation = vi.fn().mockRejectedValue(error);
    await expect(withRetry(operation, 3, 1)).rejects.toThrow('db constraint failed');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe('withRetry — explicitly non-retryable errors', () => {
  it('does not retry an error carrying retryable: false', async () => {
    // A deterministic refusal returns the same answer every attempt, so
    // retrying only multiplies transactions, log noise and latency.
    class Refused extends Error {
      readonly retryable = false;
    }
    const operation = vi.fn().mockRejectedValue(new Refused('nope'));

    await expect(withRetry(operation)).rejects.toThrow('nope');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('still retries an ordinary transient error', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValue('ok');

    await expect(withRetry(operation)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
