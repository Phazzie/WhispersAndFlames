# Digital Ocean Deployment Guide

## Deployment Method: Buildpack (Not Docker)

This app uses Digital Ocean's **Node.js buildpack** rather than Docker deployment. While we have a Dockerfile for local development and other platforms, the buildpack approach works better on Digital Ocean App Platform.

**Key Configuration**: The `NPM_CONFIG_PRODUCTION=false` environment variable prevents the buildpack from pruning devDependencies before the build, which is critical for Next.js 15 with TypeScript and Tailwind CSS.

## Prerequisites

1. **Digital Ocean Account**: Sign up at https://digitalocean.com
2. **doctl CLI** (optional but recommended): https://docs.digitalocean.com/reference/doctl/how-to/install/
3. **Repository**: Your code should be pushed to GitHub

## Option 1: Deploy via Digital Ocean Dashboard (Easiest)

### Step 1: Create App Platform App

1. Go to https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Choose **GitHub** as source
4. Select your repository: `Phazzie/WhispersAndFlames`
5. Select branch: `main`
6. Enable **"Autodeploy"** for automatic deployments on push

### Step 2: Configure Build Settings

Digital Ocean will auto-detect Node.js and suggest buildpack settings. Configure:

- **Build Command**: `npm run build`
- **Run Command**: `npm run start`
- **HTTP Port**: 3000

**Important**: Make sure to add `NPM_CONFIG_PRODUCTION=false` as a BUILD_TIME environment variable (see Step 4)

### Step 3: Add Database

1. In the app configuration, click **"Add Resource"**
2. Select **"Database"**
3. Choose **PostgreSQL 16**
4. Select **"Development"** ($7/month) or **"Production"** ($15/month)
5. Database connection string will be auto-injected as `DATABASE_URL`

### Step 4: Set Environment Variables

Add these in the "Environment Variables" section:

**Critical for Build Success:**

```
NPM_CONFIG_PRODUCTION = false (scope: BUILD_TIME)
```

This prevents the buildpack from removing devDependencies before the build.

**Required:**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = <pk_...>   (scope: RUN_AND_BUILD_TIME)
CLERK_SECRET_KEY = <sk_...>                    (scope: RUN_AND_BUILD_TIME)
XAI_API_KEY = <your_xai_api_key>               (scope: RUN_AND_BUILD_TIME)
CRON_SECRET = <generate_random_32char_string>
NEXT_PUBLIC_APP_URL = https://your-app.ondigitalocean.app
NODE_ENV = production (scope: RUN_AND_BUILD_TIME)
```

The first three are validated at startup by `src/lib/env.ts`; the app exits
immediately if any is missing. Get the Clerk keys from
https://dashboard.clerk.com/ and the xAI key from https://console.x.ai/.

**All three need `RUN_AND_BUILD_TIME`, not just run scope.** `next build`
collects page data, which loads `src/lib/env.ts` and validates them — a
run-only secret fails the build before the app ever starts. The publishable
key additionally must be the real value at build time, because Next inlines
`NEXT_PUBLIC_*` into the client bundle.

`CRON_SECRET` is required whenever a database is attached: `/api/cron/cleanup`
returns 403 without it, so expired games are never purged.

`SESSION_SECRET` and `STORAGE_MODE` were previously listed here as required.
Neither is read anywhere in `src/`, and both have been removed from
`.do/app.yaml`. The storage backend is chosen by `src/lib/storage-adapter.ts`
from two conditions: PostgreSQL is used when `DATABASE_URL` is set **and**
`DISABLE_DATABASE` is not `'true'`. Setting `DISABLE_DATABASE=true` forces
in-memory storage even with a database attached.

Note that `CRON_SECRET` only _authorizes_ the cleanup endpoint — it does not
schedule anything. `vercel.json` carries a schedule for Vercel deployments;
DigitalOcean has no equivalent in this repository, so a DO deployment must
provision its own recurring authenticated `GET /api/cron/cleanup` (a DO
Function on a schedule, or any external cron) or expired games are never
purged.

### Step 5: Choose Resources

- **Basic Plan**: $5/month (512MB RAM, 1 vCPU) - good for testing
- **Professional**: $12/month (1GB RAM, 1 vCPU) - recommended for production

### Step 6: Deploy

1. Review your configuration
2. Click **"Create Resources"**
3. Wait 5-10 minutes for initial deployment
4. Your app will be available at: `https://your-app-name.ondigitalocean.app`

---

## Option 2: Deploy via doctl CLI

### Install doctl

```bash
# macOS
brew install doctl

# Linux
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
tar xf doctl-*.tar.gz
sudo mv doctl /usr/local/bin

# Authenticate
doctl auth init
```

### Deploy the App

`doctl apps update` takes a whole app spec via `--spec`; it has **no `--env`
flag** for setting individual variables. Secrets are therefore set by editing a
spec file and applying it, not by a series of per-variable commands.

```bash
# Work from a copy so real secrets never land in the repo.
# .gitignore covers .env* but NOT this file — do not commit it.
# install -m 600 rather than cp: the default umask would leave a
# world-readable file containing production credentials in /tmp.
install -m 600 .do/app.yaml /tmp/app-live.yaml
```

Edit `/tmp/app-live.yaml` and replace every placeholder with a real value:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → your `pk_...` key (it is inlined into
  the client bundle at build time, so the real value must be present here)
- `CLERK_SECRET_KEY` → your `sk_...` key
- `XAI_API_KEY` → your xAI key
- `CRON_SECRET` → output of `openssl rand -base64 32`
- `NEXT_PUBLIC_APP_URL` → **leave as `${APP_URL}`**. That is a DigitalOcean
  platform binding which resolves to the app's real URL, and the generated
  URL is not known until after `doctl apps create`. Substituting a guess
  breaks the CSRF origin check in `src/middleware.ts:16-30`, which compares
  POST origins against this value and returns 403 — every create, join and
  update call would fail. Only set a literal here once you have a custom
  domain, and then set it to that domain.

Entries marked `type: SECRET` may be given in plaintext on first apply;
DigitalOcean encrypts them and rewrites the stored spec to `EV[1:...]`.

```bash
# Create the app
doctl apps create --spec /tmp/app-live.yaml

# Get your app ID
doctl apps list

# Apply later changes by editing the spec and re-applying it
doctl apps update APP_ID --spec /tmp/app-live.yaml --wait

# Trigger a deployment
doctl apps create-deployment APP_ID

# Shred the local copy once DigitalOcean holds the encrypted values
shred -u /tmp/app-live.yaml 2>/dev/null || rm -f /tmp/app-live.yaml
```

### Monitor Deployment

```bash
# Check deployment status
doctl apps list-deployments APP_ID

# View logs
doctl apps logs APP_ID --type build
doctl apps logs APP_ID --type run
```

---

## Option 3: Test Locally with Docker First

Before deploying, test the Docker setup locally:

```bash
# Copy example env file
cp .env.docker.example .env.docker

# Edit .env.docker with your API keys
nano .env.docker

# Build and run with docker-compose
docker-compose --env-file .env.docker up --build

# Test the app
open http://localhost:3000

# Check health endpoint
curl http://localhost:3000/api/health

# Stop
docker-compose down
```

---

## Post-Deployment Configuration

### Custom Domain (Optional)

1. Go to your app in DO dashboard
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Update DNS records as instructed
5. Update `NEXT_PUBLIC_APP_URL` environment variable

### Enable Metrics

1. Navigate to **"Insights"** tab
2. Enable monitoring for:
   - CPU usage
   - Memory usage
   - Request rates
   - Response times

### Set Up Alerts

1. Go to **"Settings"** → **"Alerts"**
2. Configure alerts for:
   - High CPU usage (>80%)
   - High memory usage (>90%)
   - Failed health checks
   - Error rate spikes

### Scaling

To scale your app:

```bash
# Via CLI: edit instance_count in the spec, then re-apply it.
# `doctl apps update` accepts only --spec (plus --format/--no-header/
# --update-sources/--wait) — there is no --instance-count flag.
# umask 077 so the spec is written 0600 — it carries your secrets.
(umask 077; doctl apps spec get APP_ID > /tmp/app-live.yaml)
# edit instance_count under services[0], then:
doctl apps update APP_ID --spec /tmp/app-live.yaml --wait
shred -u /tmp/app-live.yaml 2>/dev/null || rm -f /tmp/app-live.yaml

# Or in dashboard: Settings → Scaling
```

---

## Estimated Monthly Costs

### Minimal Setup (Testing)

- App: $5/month (Basic XXS)
- Database: $7/month (Dev tier)
- **Total: ~$12/month**

### Production Setup

- App: $12/month (Basic XS)
- Database: $15/month (Prod tier with backups)
- **Total: ~$27/month**

### High Traffic

- App: $24/month (Basic S, 2 instances)
- Database: $15/month
- **Total: ~$39/month**

---

## Troubleshooting

### Build Fails with "devDependencies" Error

**Problem**: Digital Ocean buildpack prunes devDependencies before running the build, causing Next.js build to fail because TypeScript, Tailwind, and other build tools are missing.

**Solution**: The app.yaml already includes `NPM_CONFIG_PRODUCTION=false` which prevents pruning devDependencies:

```yaml
envs:
  - key: NPM_CONFIG_PRODUCTION
    scope: BUILD_TIME
    value: 'false'
```

This tells npm/yarn to keep devDependencies during the build phase, allowing Next.js to compile successfully.

**Verify it's working:**

```bash
# Check build logs
doctl apps logs APP_ID --type build --follow

# You should see devDependencies being installed
# Look for: "added XXX packages" including typescript, tailwindcss, etc.
```

### Other Build Failures

```bash
# Check build logs
doctl apps logs APP_ID --type build --follow

# Common issues:
# - Missing environment variables during build
# - Type errors (should be caught in CI)
```

### App Crashes on Start

```bash
# Check runtime logs
doctl apps logs APP_ID --type run --follow

# Common issues:
# - Missing XAI_API_KEY (required - create one at https://console.x.ai/)
# - Invalid DATABASE_URL
# - Port conflicts
```

### Database Connection Issues

```bash
# Test database connection
doctl databases list
doctl databases connection APP_DB_ID

# Verify DATABASE_URL is set correctly
# Format: postgresql://user:password@host:port/dbname
```

### Health Check Fails

- Verify `/api/health` endpoint is accessible
- Check if app is listening on port 3000
- Increase `initial_delay_seconds` in app.yaml if needed

---

## Maintenance

### View Logs

```bash
doctl apps logs APP_ID --type run --follow
```

### Redeploy

```bash
# Trigger new deployment (pulls latest from GitHub)
doctl apps create-deployment APP_ID
```

### Database Backup

```bash
# List backups (this is the whole command — there is no `list` subcommand)
doctl databases backups DB_ID
```

DigitalOcean managed databases back up automatically; `doctl` exposes no
on-demand backup command. Take a manual snapshot with `pg_dump` against the
connection details from `doctl databases connection DB_ID`.

### Update Environment Variables

There is no per-variable flag. Fetch the live spec, edit it, and re-apply:

```bash
# umask 077 so the spec is written 0600 — shell redirection would
# otherwise use the default umask and leave credentials world-readable.
(umask 077; doctl apps spec get APP_ID > /tmp/app-live.yaml)
# add or edit the entry under services[0].envs, then:
doctl apps update APP_ID --spec /tmp/app-live.yaml --wait
shred -u /tmp/app-live.yaml 2>/dev/null || rm -f /tmp/app-live.yaml
```

---

## Security Checklist

- ✅ Generate strong `CRON_SECRET` (32+ characters) — authorizes the cleanup endpoint
- ✅ Use encrypted environment variables for secrets
- ✅ Enable production database tier for automatic backups
- ✅ Set up firewall rules (DO automatically secures database)
- ✅ Enable HTTPS (automatic with DO App Platform)
- ✅ Rotate API keys periodically
- ✅ Monitor logs for suspicious activity

---

## Next Steps

1. ✅ Test locally with `docker-compose`
2. ✅ Deploy to Digital Ocean
3. ✅ Configure custom domain (optional)
4. ✅ Set up monitoring and alerts
5. ✅ Test the deployed application
6. ✅ Share the URL with your users!

Your app will be live at: `https://whispers-and-flames.ondigitalocean.app` 🔥
