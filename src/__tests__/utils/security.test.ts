import { describe, it, expect } from 'vitest';

import {
  sanitizeHtml,
  escapeHtml,
  sanitizePath,
  generateSecureToken,
  isValidEmail,
  isSafeString,
  truncateInput,
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
    expect(sanitizePath('%2e%2e/%2e%2e/secret')).toBe('/secret');
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
