/**
 * Storage adapter that selects between PostgreSQL and in-memory storage
 * based on environment configuration
 */

import { storage as memoryStorage } from './storage-memory';
import { createLogger } from './utils/logger';

const logger = createLogger('storage-adapter');

// Use PostgreSQL if DATABASE_URL is available, otherwise fall back to in-memory
const usePostgres = Boolean(process.env.DATABASE_URL);

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
        logger.error(
          'Failed to initialize database schema',
          err instanceof Error ? err : undefined
        );
        logger.error('Falling back to in-memory storage may not be possible at runtime');
      });
    }

    logger.info('Using PostgreSQL storage', { databaseConfigured: true });
  } catch (err) {
    logger.error(
      'Failed to load PostgreSQL storage module',
      err instanceof Error ? err : undefined
    );
    logger.info('Falling back to in-memory storage', { reason: 'PostgreSQL module load failed' });
    storage = memoryStorage;
  }
} else {
  logger.info('Using in-memory storage', { reason: 'DATABASE_URL not configured' });
  storage = memoryStorage;
}

// Export the appropriate storage implementation
export { storage, initSchema };
