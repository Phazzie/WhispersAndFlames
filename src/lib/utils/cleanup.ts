/**
 * Centralized cleanup utilities for serverless environments
 * These functions provide opportunistic cleanup without using setInterval
 */

interface ExpirableEntry {
  expiresAt?: Date;
  createdAt?: number;
}

/**
 * Opportunistic cleanup for Map-based stores
 * Removes expired entries up to a maximum limit to prevent blocking
 *
 * @param store - Map to clean up
 * @param isExpired - Function to determine if an entry is expired
 * @param maxCleanup - Maximum number of entries to clean per call (default: 50)
 * @returns Number of entries cleaned
 */
export function opportunisticCleanup<K, V>(
  store: Map<K, V>,
  isExpired: (value: V) => boolean,
  maxCleanup: number = 50
): number {
  let cleaned = 0;

  for (const [key, value] of store.entries()) {
    if (isExpired(value)) {
      store.delete(key);
      cleaned++;
    }

    // Limit cleanup to prevent blocking
    if (cleaned >= maxCleanup) break;
  }

  return cleaned;
}

/**
 * Check if a date-based entry is expired
 */
export function isDateExpired(expiresAt: Date): boolean {
  return expiresAt < new Date();
}

/**
 * Check if a timestamp-based entry is expired
 */
export function isTimestampExpired(
  createdAt: number,
  lifetimeMs: number
): boolean {
  return Date.now() - createdAt > lifetimeMs;
}

/**
 * Randomly trigger cleanup based on probability
 * Default: 10% chance (0.1)
 */
export function shouldCleanup(probability: number = 0.1): boolean {
  return Math.random() < probability;
}
