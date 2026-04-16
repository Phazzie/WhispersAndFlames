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
});
