/**
 * Storage adapter that selects between PostgreSQL and in-memory storage
 * based on environment configuration
 */

import { storage as memoryStorage } from './storage-memory';
import { createLogger } from './utils/logger';

const logger = createLogger('storage-adapter');

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

// Use PostgreSQL if DATABASE_URL is available AND database is not explicitly disabled
// DISABLE_DATABASE=true can be used to force in-memory storage even when DATABASE_URL is set
const usePostgres = Boolean(process.env.DATABASE_URL) && process.env.DISABLE_DATABASE !== 'true';

// Conditionally import PostgreSQL storage only when DATABASE_URL is configured
// This prevents import errors at build time when pg module dependencies aren't available
let storage: typeof memoryStorage;
let initSchema: (() => Promise<void>) | undefined;

if (usePostgres) {
  try {
    // Dynamic import to avoid loading pg module when not needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pgModule = require('./storage-pg');
    storage = pgModule.storage;
    initSchema = pgModule.initSchema;

    // Initialize database schema
    if (initSchema) {
      initSchema().catch((err: Error) => {
        logger.error('Failed to initialize database schema', toError(err));
        logger.warn('Falling back to in-memory storage may not be possible at runtime');
      });
    }

    logger.info('Using PostgreSQL storage', { databaseConfigured: true });
  } catch (err) {
    logger.error('Failed to load PostgreSQL storage module', toError(err));
    logger.info('Falling back to in-memory storage', { reason: 'PostgreSQL module load failed' });
    storage = memoryStorage;
  }
} else {
  if (process.env.DISABLE_DATABASE === 'true') {
    logger.info('Using in-memory storage', {
      reason: 'database explicitly disabled via DISABLE_DATABASE',
    });
  } else {
    logger.info('Using in-memory storage', { reason: 'DATABASE_URL not configured' });
  }
  storage = memoryStorage;
}

// Export the appropriate storage implementation
export { storage, initSchema };
