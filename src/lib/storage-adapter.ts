/**
 * Storage adapter that selects between PostgreSQL and in-memory storage
 * based on environment configuration
 */

import { storage as memoryStorage } from './storage';

const usePostgres = Boolean(process.env.DATABASE_URL);

let storage = memoryStorage;
let initSchema: (() => Promise<void>) | undefined;

if (usePostgres) {
  import('./storage-pg')
    .then((pgModule) => {
      storage = pgModule.storage;
      initSchema = pgModule.initSchema;

      if (typeof initSchema === 'function') {
        initSchema().catch((err: Error) => {
          console.error('❌ Failed to initialize database schema:', err);
          console.error('Falling back to in-memory storage may not be possible at runtime');
        });
      }

      console.log('🗄️  Using PostgreSQL storage (DATABASE_URL configured)');
    })
    .catch((err) => {
      console.error('❌ Failed to load PostgreSQL storage module:', err);
      console.log('💾 Falling back to in-memory storage');
    });
} else {
  console.log('💾 Using in-memory storage (DATABASE_URL not configured)');
}

export { storage, initSchema };
