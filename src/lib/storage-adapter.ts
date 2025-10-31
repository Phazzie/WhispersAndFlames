/**
 * Storage adapter that selects between PostgreSQL and in-memory storage
 * based on environment configuration
 */

import { storage as memoryStorage } from './storage';
import { storage as pgStorage, initSchema } from './storage-pg';

// Use PostgreSQL if DATABASE_URL is available, otherwise fall back to in-memory
const usePostgres = Boolean(process.env.DATABASE_URL);

// Initialize database schema if using PostgreSQL
if (usePostgres) {
  initSchema().catch((err) => {
    console.error('❌ Failed to initialize database schema:', err);
    console.error('Falling back to in-memory storage may not be possible at runtime');
  });
}

// Log which storage backend is being used
console.log(
  usePostgres
    ? '🗄️  Using PostgreSQL storage (DATABASE_URL configured)'
    : '💾 Using in-memory storage (DATABASE_URL not configured)'
);

// Export the appropriate storage implementation
export const storage = usePostgres ? pgStorage : memoryStorage;

// Export for tests or manual initialization
export { initSchema };
