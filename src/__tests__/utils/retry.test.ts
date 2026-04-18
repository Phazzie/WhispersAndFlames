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

  it('does not retry errors containing "duplicate" or "constraint" in the message', async () => {
    const duplicateErr = new Error('duplicate key value violates unique constraint');
    const constraintErr = new Error('violates check constraint');

    const op1 = vi.fn().mockRejectedValue(duplicateErr);
    const op2 = vi.fn().mockRejectedValue(constraintErr);

    await expect(withRetry(op1, 3, 1)).rejects.toThrow('duplicate');
    expect(op1).toHaveBeenCalledTimes(1);

    await expect(withRetry(op2, 3, 1)).rejects.toThrow('constraint');
    expect(op2).toHaveBeenCalledTimes(1);
  });

  it('retries on "Invalid question length" errors (AI transient quality failure)', async () => {
    // This is the key regression test: previously the "invalid" message check in
    // defaultShouldRetry prevented retries on AI response quality errors, causing
    // generateQuestionAction to fail immediately on the first bad AI response.
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Invalid question length: 5'))
      .mockResolvedValueOnce('good question');

    const result = await withRetry(operation, 3, 1);
    expect(result).toBe('good question');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('retries on other "invalid" message errors (e.g. short summary, short notes)', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Summary too short: 10'))
      .mockResolvedValueOnce({ summary: 'a'.repeat(200) });

    const result = await withRetry(operation, 3, 1);
    expect(result).toEqual({ summary: 'a'.repeat(200) });
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
