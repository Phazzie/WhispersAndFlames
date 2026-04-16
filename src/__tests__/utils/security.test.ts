import { describe, it, expect, vi } from 'vitest';

import {
  sanitizeHtml,
  escapeHtml,
  sanitizePath,
  generateSecureToken,
  isValidEmail,
  isSafeString,
  truncateInput,
  checkRateLimit,
  getClientIp,
} from '@/lib/utils/security';

describe('sanitizeHtml', () => {
  it('should strip all HTML tags from input', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
    expect(sanitizeHtml('<b>bold</b>')).toBe('bold');
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe('');
  });

  it('should return plain text unchanged', () => {
    expect(sanitizeHtml('Hello, world!')).toBe('Hello, world!');
    expect(sanitizeHtml('No HTML here 123')).toBe('No HTML here 123');
  });

  it('should return empty string for non-string input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeHtml(null as any)).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeHtml(undefined as any)).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeHtml(42 as any)).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('escapeHtml', () => {
  it('should escape & to &amp;', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should escape < and >', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('should escape forward slash', () => {
    expect(escapeHtml('a/b')).toBe('a&#x2F;b');
  });

  it('should escape all special characters together', () => {
    expect(escapeHtml('<a href="/page?a=1&b=2">link</a>')).toBe(
      '&lt;a href=&quot;&#x2F;page?a=1&amp;b=2&quot;&gt;link&lt;&#x2F;a&gt;'
    );
  });

  it('should return empty string for falsy input', () => {
    expect(escapeHtml('')).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(escapeHtml(null as any)).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(escapeHtml(undefined as any)).toBe('');
  });

  it('should leave safe text unchanged', () => {
    expect(escapeHtml('Hello world')).toBe('Hello world');
  });
});

describe('sanitizePath', () => {
  it('should remove path traversal sequences', () => {
    expect(sanitizePath('../etc/passwd')).toBe('/etc/passwd');
    expect(sanitizePath('../../secret')).toBe('/secret');
  });

  it('should remove backslashes', () => {
    expect(sanitizePath('C:\\Windows\\System32')).toBe('C:WindowsSystem32');
  });

  it('should collapse double slashes', () => {
    expect(sanitizePath('foo//bar')).toBe('foo/bar');
  });

  it('should return empty string for falsy input', () => {
    expect(sanitizePath('')).toBe('');
  });

  it('should handle normal paths without modification (except allowed transforms)', () => {
    const result = sanitizePath('/safe/path/to/file');
    expect(result).toContain('safe');
    expect(result).toContain('path');
  });
});

describe('generateSecureToken', () => {
  it('should generate a hex string of correct length', () => {
    const token = generateSecureToken(32);
    // Each byte = 2 hex chars, so 32 bytes = 64 chars
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it('should use default length of 32 bytes when no arg provided', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
  });

  it('should generate unique tokens', () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    expect(token1).not.toBe(token2);
  });

  it('should handle custom lengths', () => {
    expect(generateSecureToken(16)).toHaveLength(32);
    expect(generateSecureToken(64)).toHaveLength(128);
  });
});

describe('isValidEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@sub.domain.org')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
  });

  it('should return false for invalid email addresses', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@nodomain')).toBe(false);
    expect(isValidEmail('noat.com')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('should return false for email with multiple @ signs', () => {
    expect(isValidEmail('a@@b.com')).toBe(false);
  });
});

describe('isSafeString', () => {
  it('should return true for alphanumeric strings', () => {
    expect(isSafeString('Hello World 123')).toBe(true);
    expect(isSafeString('abc123')).toBe(true);
  });

  it('should return true for strings with allowed punctuation', () => {
    expect(isSafeString('Hello, world!')).toBe(true);
    expect(isSafeString("It's fine")).toBe(true);
    expect(isSafeString('user@example.com')).toBe(true);
  });

  it('should return false for strings with null bytes', () => {
    expect(isSafeString('hello\x00world')).toBe(false);
  });

  it('should return true for strings with newlines (newlines are whitespace)', () => {
    // \s in the safe pattern includes newlines
    expect(isSafeString('hello\nworld')).toBe(true);
  });

  it('should return false for strings with emoji', () => {
    expect(isSafeString('Hello 🎉')).toBe(false);
  });
});

describe('truncateInput', () => {
  it('should return input unchanged if within limit', () => {
    expect(truncateInput('short', 100)).toBe('short');
    expect(truncateInput('exactly ten', 11)).toBe('exactly ten');
  });

  it('should truncate input that exceeds the limit', () => {
    const longString = 'a'.repeat(200);
    const result = truncateInput(longString, 100);
    expect(result).toHaveLength(100);
    expect(result).toBe('a'.repeat(100));
  });

  it('should use default max length of 10000', () => {
    const exactly10000 = 'x'.repeat(10000);
    expect(truncateInput(exactly10000)).toHaveLength(10000);

    const over10000 = 'x'.repeat(10001);
    expect(truncateInput(over10000)).toHaveLength(10000);
  });

  it('should handle empty string', () => {
    expect(truncateInput('', 100)).toBe('');
  });
});

describe('checkRateLimit', () => {
  // We use unique identifiers per test to avoid cross-test state pollution
  // since the module-level rateLimitStore persists across tests.
  const generateTestId = (label: string) => `test-${label}-${Date.now()}-${Math.random()}`;

  it('should allow the first request', () => {
    expect(checkRateLimit(generateTestId('first'), 5, 60000)).toBe(true);
  });

  it('should allow requests up to the limit', () => {
    const id = generateTestId('up-to-limit');
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(id, 5, 60000)).toBe(true);
    }
  });

  it('should block requests exceeding the limit', () => {
    const id = generateTestId('exceed');
    for (let i = 0; i < 5; i++) {
      checkRateLimit(id, 5, 60000);
    }
    expect(checkRateLimit(id, 5, 60000)).toBe(false);
  });

  it('should reset after the window expires', () => {
    vi.useFakeTimers();
    const id = generateTestId('window-reset');

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit(id, 3, 60000);
    }
    expect(checkRateLimit(id, 3, 60000)).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(61000);

    // Should allow requests again
    expect(checkRateLimit(id, 3, 60000)).toBe(true);
    vi.useRealTimers();
  });

  it('should track different identifiers independently', () => {
    const id1 = generateTestId('independent-a');
    const id2 = generateTestId('independent-b');

    // Exhaust id1
    for (let i = 0; i < 3; i++) {
      checkRateLimit(id1, 3, 60000);
    }
    expect(checkRateLimit(id1, 3, 60000)).toBe(false);

    // id2 should still be allowed
    expect(checkRateLimit(id2, 3, 60000)).toBe(true);
  });

  it('should run deterministic cleanup after the cleanup interval', () => {
    vi.useFakeTimers();
    const id = generateTestId('cleanup');
    checkRateLimit(id, 5, 60000);

    // Advance past both the window and the cleanup interval
    vi.advanceTimersByTime(120000);

    // A new request to any identifier should trigger cleanup
    const triggerId = generateTestId('trigger-cleanup');
    expect(checkRateLimit(triggerId, 5, 60000)).toBe(true);

    // The original entry should now reset (expired → lazy cleaned on access)
    expect(checkRateLimit(id, 5, 60000)).toBe(true);
    vi.useRealTimers();
  });
});

describe('getClientIp', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
    });
    expect(getClientIp(request)).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header when x-forwarded-for is absent', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '10.0.0.5' },
    });
    expect(getClientIp(request)).toBe('10.0.0.5');
  });

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '5.6.7.8' },
    });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });

  it('should return "unknown" when no IP headers are present', () => {
    const request = new Request('http://localhost');
    expect(getClientIp(request)).toBe('unknown');
  });

  it('should handle single IP in x-forwarded-for (no comma)', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.42' },
    });
    expect(getClientIp(request)).toBe('203.0.113.42');
  });
});
