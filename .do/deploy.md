# Digital Ocean Deployment Guide

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

Digital Ocean will auto-detect the Dockerfile. Verify:

- **Build Command**: (detected automatically from Dockerfile)
- **Run Command**: (detected automatically from Dockerfile CMD)
- **HTTP Port**: 3000

### Step 3: Add Database

1. In the app configuration, click **"Add Resource"**
2. Select **"Database"**
3. Choose **PostgreSQL 16**
4. Select **"Development"** ($7/month) or **"Production"** ($15/month)
5. Database connection string will be auto-injected as `DATABASE_URL`

### Step 4: Set Environment Variables

Add these in the "Environment Variables" section:

**Required:**

```
GEMINI_API_KEY = <your_gemini_api_key>
SESSION_SECRET = <generate_random_32char_string>
NEXT_PUBLIC_APP_URL = https://your-app.ondigitalocean.app
STORAGE_MODE = postgres
```

**Optional:**

```
XAI_API_KEY = <if_using_xai>
```

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

```bash
# Create the app from spec file
doctl apps create --spec .do/app.yaml

# Get your app ID
doctl apps list

# Set environment secrets (replace APP_ID)
doctl apps update APP_ID --env GEMINI_API_KEY=your_api_key
doctl apps update APP_ID --env SESSION_SECRET=$(openssl rand -base64 32)
doctl apps update APP_ID --env NEXT_PUBLIC_APP_URL=https://your-app.ondigitalocean.app

# Trigger deployment
doctl apps create-deployment APP_ID
```

### Monitor Deployment

```bash
# Check deployment status
doctl apps list-deployments APP_ID

# View logs
doctl apps logs APP_ID --type BUILD
doctl apps logs APP_ID --type RUN
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
# Via CLI
doctl apps update APP_ID --instance-count 2

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

### Build Fails

```bash
# Check build logs
doctl apps logs APP_ID --type BUILD --follow

# Common issues:
# - Missing environment variables during build
# - Type errors (should be caught in CI)
```

### App Crashes on Start

```bash
# Check runtime logs
doctl apps logs APP_ID --type RUN --follow

# Common issues:
# - Missing GEMINI_API_KEY
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
doctl apps logs APP_ID --type RUN --follow
```

### Redeploy

```bash
# Trigger new deployment (pulls latest from GitHub)
doctl apps create-deployment APP_ID
```

### Database Backup

```bash
# List backups
doctl databases backups list DB_ID

# Create manual backup
doctl databases backups create DB_ID
```

### Update Environment Variables

```bash
doctl apps update APP_ID --env NEW_VAR=value
```

---

## Security Checklist

- ✅ Generate strong `SESSION_SECRET` (32+ characters)
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
