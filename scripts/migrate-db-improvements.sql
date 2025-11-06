-- Database Improvements Migration Script
-- Run this script on existing databases to add performance indexes
-- This is safe to run multiple times (CREATE INDEX IF NOT EXISTS)

-- Add GIN index for efficient playerIds lookups
-- This enables fast queries like: WHERE state->'playerIds' @> '["user123"]'::jsonb
CREATE INDEX IF NOT EXISTS idx_games_player_ids
  ON games USING GIN ((state->'playerIds'));

-- Verify indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('games', 'sessions')
ORDER BY tablename, indexname;

-- Verify GIN index is being used (example query)
EXPLAIN ANALYZE
SELECT state FROM games
WHERE state->'playerIds' @> '["test-user"]'::jsonb
  AND expires_at > NOW()
LIMIT 50;

-- Show current connection pool and table statistics
SELECT
  schemaname,
  tablename,
  n_tup_ins as "Inserts",
  n_tup_upd as "Updates",
  n_tup_del as "Deletes",
  n_live_tup as "Live Rows",
  n_dead_tup as "Dead Rows",
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- Show index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as "Index Scans",
  idx_tup_read as "Index Tuples Read",
  idx_tup_fetch as "Index Tuples Fetched"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
