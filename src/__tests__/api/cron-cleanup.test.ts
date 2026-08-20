import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * The cron cleanup route reads `env.CRON_SECRET` / `env.DATABASE_URL` at
 * request time from the module-level `env` object in `@/lib/env`. Each test
 * therefore needs its own copy of that module: we reset the module registry,
 * register the mocks with `vi.doMock`, and dynamically import the route so it
 * binds to the freshly mocked env.
 */

type MockEnv = { CRON_SECRET?: string; DATABASE_URL?: string };

const mockCleanupExpiredData = vi.fn();

const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

async function loadRoute(mockEnv: MockEnv) {
  vi.resetModules();

  vi.doMock('@/lib/env', () => ({
    env: mockEnv,
    validateEnv: vi.fn().mockReturnValue(mockEnv),
  }));

  // Mock logger to suppress output in tests
  vi.doMock('@/lib/utils/logger', () => ({
    logger: loggerMock,
    createLogger: vi.fn().mockReturnValue(loggerMock),
  }));

  // The route imports this dynamically; mock it so no real database is needed.
  vi.doMock('@/lib/storage-pg', () => ({
    cleanupExpiredData: mockCleanupExpiredData,
  }));

  const routeModule = await import('@/app/api/cron/cleanup/route');
  return routeModule.GET;
}

function makeRequest(authHeader?: string): Request {
  return new Request('http://localhost/api/cron/cleanup', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe('GET /api/cron/cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanupExpiredData.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.doUnmock('@/lib/env');
    vi.doUnmock('@/lib/utils/logger');
    vi.doUnmock('@/lib/storage-pg');
    vi.resetModules();
  });

  it('returns 403 when CRON_SECRET is not set', async () => {
    const GET = await loadRoute({ DATABASE_URL: 'postgres://localhost/test' });

    const response = await GET(makeRequest('Bearer anything'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Forbidden: CRON_SECRET not set' });
    expect(mockCleanupExpiredData).not.toHaveBeenCalled();
  });

  it('returns 401 when the Authorization header is missing or wrong', async () => {
    const GET = await loadRoute({
      CRON_SECRET: 'super-secret',
      DATABASE_URL: 'postgres://localhost/test',
    });

    const missing = await GET(makeRequest());
    const missingBody = await missing.json();
    expect(missing.status).toBe(401);
    expect(missingBody).toEqual({ error: 'Unauthorized' });

    const wrong = await GET(makeRequest('Bearer wrong-secret'));
    const wrongBody = await wrong.json();
    expect(wrong.status).toBe(401);
    expect(wrongBody).toEqual({ error: 'Unauthorized' });

    expect(mockCleanupExpiredData).not.toHaveBeenCalled();
  });

  it('returns 200 and skips cleanup when authorized but DATABASE_URL is unset', async () => {
    const GET = await loadRoute({ CRON_SECRET: 'super-secret' });

    const response = await GET(makeRequest('Bearer super-secret'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('in-memory storage');
    expect(mockCleanupExpiredData).not.toHaveBeenCalled();
  });

  it('returns 200 and runs cleanup when authorized with DATABASE_URL set', async () => {
    const GET = await loadRoute({
      CRON_SECRET: 'super-secret',
      DATABASE_URL: 'postgres://localhost/test',
    });

    const response = await GET(makeRequest('Bearer super-secret'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Database cleanup completed successfully');
    expect(mockCleanupExpiredData).toHaveBeenCalledOnce();
  });
});
