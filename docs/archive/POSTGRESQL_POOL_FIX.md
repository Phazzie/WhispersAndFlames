# PostgreSQL Connection Pool Fix

## Problem

The Vercel deployment build logs showed an error during shutdown:

```
Shutting down PostgreSQL connection pool...
PostgreSQL connection pool closed successfully
Shutting down PostgreSQL connection pool...
Error closing PostgreSQL pool: Error: Called end on pool more than once
    at process.a (.next/server/chunks/684.js:39:796)
```

## Root Cause

In commit `270a25e` (the deployment commit shown in the Vercel logs), the file `src/lib/storage-pg.ts` contained process shutdown handlers that attempted to gracefully close the PostgreSQL connection pool:

```javascript
// Graceful shutdown handling to prevent connection leaks
if (typeof process !== 'undefined') {
  const cleanup = async () => {
    console.log('Shutting down PostgreSQL connection pool...');
    clearInterval(pgCleanupInterval);

    try {
      await pool.end();
      console.log('PostgreSQL connection pool closed successfully');
    } catch (err) {
      console.error('Error closing PostgreSQL pool:', err);
    }
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('beforeExit', cleanup);
}
```

### Why This Caused the Error

1. **Multiple Event Handlers**: Three different process events (SIGTERM, SIGINT, beforeExit) all registered the same `cleanup()` function
2. **Multiple Signal Firing**: During the Next.js build process shutdown, multiple signals can be triggered
3. **Double Pool Closure**: The `cleanup()` function was called more than once, attempting to close the pool multiple times
4. **pg Library Protection**: The PostgreSQL `pg` library detects this and throws the error "Called end on pool more than once"

## The Fix

Commit `60c0ba3` (Switch deployment to Vercel platform #22) removed the problematic shutdown code:

### Changes Made:

1. **Removed setInterval cleanup** - Not compatible with serverless environments
2. **Removed all process event listeners** - No longer calling `pool.end()`
3. **Added Cron-compatible cleanup function**:

   ```typescript
   export async function cleanupExpiredData(): Promise<void> {
     try {
       const client = await pool.connect();
       try {
         await client.query('SELECT cleanup_expired_data()');
         console.log('✅ Database cleanup completed successfully');
       } finally {
         client.release();
       }
     } catch (err) {
       console.error('❌ Database cleanup failed:', err);
       throw err;
     }
   }
   ```

4. **Added explanatory comment**:
   ```typescript
   // Note: Graceful shutdown is not needed in serverless environments
   // Vercel automatically handles connection cleanup after function execution
   ```

### Why This Fix Works

In serverless environments like Vercel:

- Functions are stateless and short-lived
- Vercel automatically handles resource cleanup after function execution
- Manual shutdown handlers are unnecessary and can cause race conditions
- Connection pools are automatically cleaned up when the function terminates

## Verification

✅ **Build Test Passed**: Building the project with `DATABASE_URL` configured completes successfully with no errors:

```bash
DATABASE_URL="postgresql://..." npm run build
# Result: ✓ Compiled successfully - NO ERRORS
```

✅ **Code Review**: Current code has no `process.on()` event listeners or `pool.end()` calls

✅ **Pattern Confirmed**: This is the recommended pattern for serverless PostgreSQL connections

## Status

**🎉 ISSUE RESOLVED**

The fix is already present in the codebase (commit 60c0ba3 and later). The error shown in the Vercel logs was from an older deployment (commit 270a25e).

## Recommendation

Once this PR is merged to the `main` branch, Vercel will deploy the fixed version and the "Called end on pool more than once" error will no longer occur.

## Additional Notes

- The connection pool (`pool`) is still properly managed with appropriate settings:
  - `max: 20` connections
  - `idleTimeoutMillis: 30000` (30 seconds)
  - `connectionTimeoutMillis: 2000` (2 seconds)
- Individual client connections are still properly released after use with `client.release()`
- Database cleanup is now handled via Vercel Cron Jobs calling `/api/cron/cleanup`
