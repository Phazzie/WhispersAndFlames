# Database Disable Feature Guide

## Overview

This guide explains how to use the `DISABLE_DATABASE` environment variable to temporarily disable PostgreSQL and use in-memory storage instead.

## When to Use This Feature

Use `DISABLE_DATABASE=true` when:

- **Database Connection Issues**: PostgreSQL is experiencing connectivity problems
- **Database Performance Issues**: Database queries are timing out or running slowly
- **Database Maintenance**: Database is undergoing maintenance or upgrades
- **Testing/Debugging**: You want to isolate issues by testing without the database
- **Quick Rollback**: You need to quickly switch to in-memory storage without removing DATABASE_URL

## How It Works

The `DISABLE_DATABASE` flag provides a simple override mechanism:

```
┌─────────────────────────────────────────────┐
│  DISABLE_DATABASE Check                     │
│  ├─ true  → Use in-memory storage           │
│  └─ false or not set → Check DATABASE_URL  │
│      ├─ Set     → Use PostgreSQL            │
│      └─ Not set → Use in-memory storage     │
└─────────────────────────────────────────────┘
```

**Priority Order:**

1. `DISABLE_DATABASE=true` → Always use in-memory storage
2. `DATABASE_URL` set → Use PostgreSQL
3. Neither set → Use in-memory storage (default)

## Usage Examples

### Method 1: Environment Variable (Recommended for Production)

```bash
# In your deployment environment (Vercel, Railway, etc.)
DISABLE_DATABASE=true
DATABASE_URL=postgresql://user:pass@host:5432/db  # Kept for future use
```

### Method 2: .env.local File (Development)

```bash
# Create or edit .env.local
echo "DISABLE_DATABASE=true" >> .env.local
npm run dev
```

### Method 3: Command Line (Quick Testing)

```bash
# One-time disable for current command
DISABLE_DATABASE=true npm run dev

# Or for build
DISABLE_DATABASE=true npm run build
```

## Verification

### Check Console Output

When the app starts, look for these messages:

**Database Disabled:**

```
💾 Using in-memory storage (database explicitly disabled via DISABLE_DATABASE)
```

**Database Not Configured:**

```
💾 Using in-memory storage (DATABASE_URL not configured)
```

**Database Enabled:**

```
🗄️  Using PostgreSQL storage (DATABASE_URL configured)
```

### Check Health Endpoint

Call the health endpoint to verify storage mode:

```bash
curl http://localhost:9002/api/health/db
```

**Response when disabled:**

```json
{
  "database": {
    "status": "disabled",
    "message": "Database explicitly disabled via DISABLE_DATABASE - using in-memory storage",
    "timestamp": "2025-11-12T14:00:00.000Z"
  },
  "storageMode": "memory",
  "checks": {
    "connectivity": false,
    "performance": false,
    "poolHealth": false
  }
}
```

## Re-enabling the Database

To re-enable PostgreSQL:

1. **Remove or set to false:**

   ```bash
   DISABLE_DATABASE=false
   # or simply remove the variable
   unset DISABLE_DATABASE
   ```

2. **Restart the application:**

   ```bash
   npm run dev
   ```

3. **Verify via health endpoint:**
   ```bash
   curl http://localhost:9002/api/health/db
   ```

## Important Considerations

### Data Persistence

⚠️ **Warning**: In-memory storage does NOT persist data across restarts!

When using `DISABLE_DATABASE=true`:

- All user accounts are lost on restart
- All active games are lost on restart
- All sessions are lost on restart

This is acceptable for:

- Troubleshooting temporary database issues
- Short-term testing
- Emergency fallback scenarios

### Not Recommended For:

- Long-term production use
- Scenarios requiring data persistence
- Multi-instance deployments (each instance has separate memory)

## Production Deployment

### Vercel Example

1. Go to your project settings
2. Navigate to Environment Variables
3. Add: `DISABLE_DATABASE` with value `true`
4. Redeploy your application

### Railway Example

```bash
railway variables set DISABLE_DATABASE=true
railway up
```

### Docker Example

```dockerfile
# In docker-compose.yml
environment:
  - DISABLE_DATABASE=true
  - DATABASE_URL=postgresql://...
```

## Monitoring

Monitor your storage mode using:

### Application Logs

```bash
# Look for storage mode messages at startup
npm run dev 2>&1 | grep -i storage
```

### Health Check Monitoring

Set up monitoring tools to track the health endpoint:

```yaml
# Example: Uptime monitoring
- endpoint: /api/health/db
  check: response.database.status == "disabled"
  alert: 'Database is disabled - running on in-memory storage'
```

## Troubleshooting

### Issue: Database still being used despite DISABLE_DATABASE=true

**Solution:**

1. Verify the environment variable is actually set:
   ```bash
   echo $DISABLE_DATABASE
   # Should output: true
   ```
2. Restart the application completely
3. Check the startup logs for the storage mode message

### Issue: Getting "not_configured" instead of "disabled"

**Cause:** `DISABLE_DATABASE` is not exactly the string `"true"`

**Solution:** Ensure the value is exactly `true` (lowercase, no quotes in the actual value)

```bash
# Correct
DISABLE_DATABASE=true

# Incorrect
DISABLE_DATABASE="true"  # Extra quotes
DISABLE_DATABASE=True    # Capital T
DISABLE_DATABASE=1       # Not a string "true"
```

### Issue: Application crashes after disabling database

**Likely Cause:** Your code is directly importing `storage-pg` instead of using `storage-adapter`

**Solution:** Always import storage from the adapter:

```typescript
// ✅ Correct - Uses adapter
import { storage } from '@/lib/storage-adapter';

// ❌ Wrong - Direct import bypasses adapter
import { storage } from '@/lib/storage-pg';
```

## Testing

Run the automated tests to verify the feature:

```bash
npm run test src/__tests__/lib/storage-adapter.test.ts
```

Expected output:

```
✓ should use in-memory storage when DATABASE_URL is not set
✓ should use in-memory storage when DISABLE_DATABASE is true
✓ should use in-memory storage when DISABLE_DATABASE is false and DATABASE_URL is not set
✓ should prioritize DISABLE_DATABASE over DATABASE_URL
```

## Summary

The `DISABLE_DATABASE` feature provides a clean, reversible way to disable PostgreSQL without:

- Deleting database code
- Removing DATABASE_URL configuration
- Requiring code changes
- Complicated rollback procedures

Simply set `DISABLE_DATABASE=true`, and the application gracefully falls back to in-memory storage.
