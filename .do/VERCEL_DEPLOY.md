# Deploy to Vercel (Alternative to Digital Ocean)

## Why Vercel for Next.js?

**Pros:**

- Built specifically for Next.js (zero config)
- Automatic HTTPS, CDN, edge functions
- Free tier: Unlimited bandwidth, 100GB-hours compute
- Preview deployments for every PR
- No Docker needed - native Next.js support

**Cons:**

- Need separate PostgreSQL (Vercel Postgres or Neon)
- Serverless limitations (no long-running processes)
- Cold starts possible on free tier

---

## Quick Deploy (5 minutes)

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Login

```bash
vercel login
```

### 3. Deploy from this directory

```bash
cd /workspaces/WhispersAndFlames
vercel
```

Follow prompts:

- Link to existing project? **No**
- Project name: **whispers-and-flames**
- Directory: **./** (default)
- Override settings? **No**

### 4. Set Environment Variables

```bash
# Required secrets
vercel env add GEMINI_API_KEY production
vercel env add SESSION_SECRET production
vercel env add DATABASE_URL production

# Optional
vercel env add XAI_API_KEY production

# Public variables
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://whispers-and-flames.vercel.app
```

### 5. Deploy to Production

```bash
vercel --prod
```

Done! Your app will be live at: `https://whispers-and-flames.vercel.app`

---

## Database Options for Vercel

### Option 1: Neon (Recommended)

Free PostgreSQL, serverless, 512MB storage

```bash
# Sign up: https://neon.tech
# Get connection string, add to Vercel:
vercel env add DATABASE_URL production
# Paste: postgresql://user:pass@host/dbname?sslmode=require
```

### Option 2: Vercel Postgres

Built-in, $20/month for 512MB

```bash
# In Vercel dashboard: Storage → Create Database → Postgres
# Automatically adds DATABASE_URL
```

### Option 3: Keep Digital Ocean DB

```bash
# Use your existing DO database:
vercel env add DATABASE_URL production
# Paste your DO connection string
```

---

## Auto-Deploy from GitHub

### Via Dashboard:

1. Go to https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Import `Phazzie/WhispersAndFlames`
4. Add environment variables
5. Deploy

Every push to `main` auto-deploys!

---

## Cost Comparison

### Digital Ocean App Platform

- **$5/month** (app) + **$7-15/month** (database)
- **Total: $12-20/month**

### Vercel

- **Free tier**: 100GB bandwidth, good for hobby projects
- **Pro: $20/month**: Unlimited bandwidth, better performance
- **Database**:
  - Neon free tier (perfect for starting)
  - Vercel Postgres $20/month
  - Keep DO database $7-15/month
- **Total: $0-40/month** depending on tier

---

## Recommendation

**If your app is working on DO with buildpack, stick with it.**

**Use Vercel if:**

- You want faster deployments (no Docker build)
- You prefer serverless architecture
- You want automatic preview URLs for PRs
- You're comfortable with cold starts on free tier

**Your Dockerfile is still valuable** for:

- Local development with docker-compose
- Future migration to any Docker-based platform
- Self-hosting on a VPS/droplet

---

## Quick Vercel Deploy Now?

```bash
# One command to deploy:
npx vercel --prod
```

Then add secrets in dashboard: https://vercel.com/dashboard
