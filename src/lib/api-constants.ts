/**
 * API and server-side constants
 * Centralized configuration for timing, limits, and thresholds
 */

// Request Limits
export const MAX_REQUEST_SIZE = 1_000_000; // 1MB
export const MAX_INPUT_LENGTH = 10_000; // Maximum input field length
export const MAX_ANSWER_LENGTH = 5_000; // Maximum answer length

// Timeouts (milliseconds)
export const AI_QUESTION_TIMEOUT_MS = 8_000; // 8 seconds
export const AI_SUMMARY_TIMEOUT_MS = 15_000; // 15 seconds
export const AI_THERAPIST_NOTES_TIMEOUT_MS = 15_000; // 15 seconds
export const AI_IMAGE_TIMEOUT_MS = 20_000; // 20 seconds

// Polling and Sync
export const GAME_STATE_POLL_INTERVAL_MS = 2_000; // 2 seconds
export const GAME_STATE_POLL_MAX_INTERVAL_MS = 10_000; // 10 seconds (for backoff)

// Security
export const PASSWORD_HASH_ITERATIONS = 100_000; // PBKDF2 iterations
export const CSRF_TOKEN_LENGTH = 32;
export const CSRF_TOKEN_LIFETIME_MS = 3_600_000; // 1 hour

// Session Management
export const SESSION_EXPIRY_DAYS = 7;
export const SESSION_CLEANUP_INTERVAL_MS = 60_000; // 1 minute
export const CSRF_CLEANUP_INTERVAL_MS = 300_000; // 5 minutes
export const PG_CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

// Rate Limiting
export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 30;
export const RATE_LIMIT_GAME_CREATE = 10;
export const RATE_LIMIT_GAME_JOIN = 20;
export const RATE_LIMIT_GAME_UPDATE = 60;

// Database
export const PG_MAX_CONNECTIONS = 20;
export const PG_IDLE_TIMEOUT_MS = 30_000; // 30 seconds
export const PG_CONNECTION_TIMEOUT_MS = 2_000; // 2 seconds

// Chaos Mode
export const CHAOS_MODE_UPGRADE_PROBABILITY = 0.2; // 20% chance
