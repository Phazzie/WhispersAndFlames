/**
 * Storage adapter that selects between PostgreSQL and in-memory storage
 * based on environment configuration
 */

import { storage as memoryStorage } from './storage';

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
        console.error('❌ Failed to initialize database schema:', err);
        console.error('Falling back to in-memory storage may not be possible at runtime');
      });
    }

    console.log('🗄️  Using PostgreSQL storage (DATABASE_URL configured)');
  } catch (err) {
    console.error('❌ Failed to load PostgreSQL storage module:', err);
    console.log('💾 Falling back to in-memory storage');
    storage = memoryStorage;
  }
} else {
  console.log('💾 Using in-memory storage (DATABASE_URL not configured)');
  storage = memoryStorage;
}

// Export the appropriate storage implementation
export { storage, initSchema };
