import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';

import { logger, createLogger } from '@/lib/utils/logger';

// The logger imports @sentry/nextjs and calls Sentry.captureException from
// logger.error when SENTRY_DSN is set. Nothing in this repo ever calls
// Sentry.init(), so that branch is dead code and is deliberately untested; the
// mock exists only to keep the real SDK out of the test run.
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

/**
 * The logger has two output shapes, chosen at call time from NODE_ENV:
 *  - production: a single JSON string per entry
 *  - anything else (including 'test'): a pretty-printed human string
 * Tests that need to inspect the structured payload stub NODE_ENV to
 * 'production'; the rest exercise the default (non-production) path.
 */

type ConsoleSpy = MockInstance<typeof console.info>;

let debugSpy: ConsoleSpy;
let infoSpy: ConsoleSpy;
let warnSpy: ConsoleSpy;
let errorSpy: ConsoleSpy;

beforeEach(() => {
  debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

/** Reads the single argument handed to a console spy as a string. */
function firstArg(spy: ConsoleSpy): string {
  expect(spy).toHaveBeenCalledTimes(1);
  return String(spy.mock.calls[0][0]);
}

/** Parses the JSON payload emitted on the production path. */
function parsedEntry(spy: ConsoleSpy): Record<string, unknown> {
  return JSON.parse(firstArg(spy)) as Record<string, unknown>;
}

describe('logger levels', () => {
  it('debug() writes to console.debug with the message (development only)', () => {
    // debug() is gated on NODE_ENV === 'development' and is a no-op under the
    // 'test' env vitest runs in, so the level has to be stubbed to see output.
    vi.stubEnv('NODE_ENV', 'development');

    logger.debug('debug message');

    expect(firstArg(debugSpy)).toContain('debug message');
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('debug() emits nothing outside development', () => {
    logger.debug('should not appear');

    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('info() writes to console.info with the message', () => {
    logger.info('info message');

    expect(firstArg(infoSpy)).toContain('info message');
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('warn() writes to console.warn with the message', () => {
    logger.warn('warn message');

    expect(firstArg(warnSpy)).toContain('warn message');
    expect(infoSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('error() writes to console.error with the message', () => {
    logger.error('error message');

    expect(firstArg(errorSpy)).toContain('error message');
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('structured payload', () => {
  it('carries timestamp, message and the supplied context as parseable JSON', () => {
    vi.stubEnv('NODE_ENV', 'production');

    logger.info('structured message', { roomCode: 'ABC123' });

    const entry = parsedEntry(infoSpy);

    expect(entry.message).toBe('structured message');
    expect(typeof entry.timestamp).toBe('string');
    expect(new Date(entry.timestamp as string).toISOString()).toBe(entry.timestamp);
    expect(entry.context).toMatchObject({ roomCode: 'ABC123' });
  });

  it('omits the level from the JSON payload, conveying it only via the console method', () => {
    // Documented quirk: output() destructures `level` off the entry before
    // JSON.stringify, so the serialized log has no level field. A consumer
    // parsing these lines must infer severity from the stream/console method.
    vi.stubEnv('NODE_ENV', 'production');

    logger.warn('level check');

    const entry = parsedEntry(warnSpy);

    expect(entry).not.toHaveProperty('level');
    expect(Object.keys(entry).sort()).toEqual(['context', 'message', 'timestamp']);
  });

  it('renders a pretty [LEVEL] prefixed line outside production', () => {
    logger.warn('pretty message', { roomCode: 'ABC123' });

    const line = firstArg(warnSpy);

    expect(line).toContain('[WARN]');
    expect(line).toContain('pretty message');
    expect(line).toContain('Context:');
    expect(line).toContain('ABC123');
  });
});

describe('createLogger', () => {
  it('tags entries with the given module name', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const moduleLogger = createLogger('some-module');
    moduleLogger.info('module message');

    const entry = parsedEntry(infoSpy);
    const context = entry.context as Record<string, unknown>;

    expect(context.module).toBe('some-module');
    expect(entry.message).toBe('module message');
  });

  it('does not leak a child logger module tag back onto the default logger', () => {
    vi.stubEnv('NODE_ENV', 'production');

    createLogger('child-module').info('child');
    logger.info('parent');

    const childContext = JSON.parse(String(infoSpy.mock.calls[0][0])).context;
    const parentContext = JSON.parse(String(infoSpy.mock.calls[1][0])).context;

    expect(childContext.module).toBe('child-module');
    expect(parentContext).not.toHaveProperty('module');
  });
});

describe('logger.error error handling', () => {
  it('includes an Error instance message, name and stack', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const err = new Error('boom');
    logger.error('operation failed', err);

    const entry = parsedEntry(errorSpy);
    const errorField = entry.error as Record<string, unknown>;

    expect(errorField.message).toBe('boom');
    expect(errorField.name).toBe('Error');
    expect(typeof errorField.stack).toBe('string');
  });

  it('produces a usable entry for a non-Error value instead of throwing', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => logger.error('operation failed', { code: 500 })).not.toThrow();

    const entry = parsedEntry(errorSpy);
    const errorField = entry.error as Record<string, unknown>;

    expect(entry.message).toBe('operation failed');
    expect(errorField.message).toBe(String({ code: 500 }));
    expect(errorField).not.toHaveProperty('stack');
  });

  it('omits the error field entirely when no error value is supplied', () => {
    vi.stubEnv('NODE_ENV', 'production');

    logger.error('no error object');

    const entry = parsedEntry(errorSpy);

    expect(entry).not.toHaveProperty('error');
    expect(entry.message).toBe('no error object');
  });
});

describe('context merging', () => {
  it('merges per-call context with the standing app/env fields', () => {
    vi.stubEnv('NODE_ENV', 'production');

    logger.info('merged', { roomCode: 'ABC123' });

    const context = parsedEntry(infoSpy).context as Record<string, unknown>;

    expect(context.app).toBe('whispers-and-flames');
    expect(context).toHaveProperty('env');
    expect(context.roomCode).toBe('ABC123');
  });

  it('still emits the standing fields when no context is supplied', () => {
    vi.stubEnv('NODE_ENV', 'production');

    logger.info('no context');

    const context = parsedEntry(infoSpy).context as Record<string, unknown>;

    expect(context.app).toBe('whispers-and-flames');
    expect(context).toHaveProperty('env');
  });

  it('lets per-call context override a standing field of the same name', () => {
    vi.stubEnv('NODE_ENV', 'production');

    logger.info('override', { app: 'other-app' });

    const context = parsedEntry(infoSpy).context as Record<string, unknown>;

    expect(context.app).toBe('other-app');
  });

  it('merges module tag, standing fields and per-call context together', () => {
    vi.stubEnv('NODE_ENV', 'production');

    createLogger('storage-pg').error('query failed', new Error('timeout'), {
      roomCode: 'ABC123',
    });

    const entry = parsedEntry(errorSpy);
    const context = entry.context as Record<string, unknown>;

    expect(context.app).toBe('whispers-and-flames');
    expect(context.module).toBe('storage-pg');
    expect(context.roomCode).toBe('ABC123');
    expect((entry.error as Record<string, unknown>).message).toBe('timeout');
  });
});
