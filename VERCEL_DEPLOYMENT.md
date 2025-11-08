# 🚀 Vercel Deployment Guide

Complete guide to deploying **Whispers and Flames** to Vercel.

## Why Vercel?

- **Native Next.js Support**: Built by the creators of Next.js
- **Zero Configuration**: Automatic detection and optimization
- **Serverless Functions**: API routes automatically become serverless functions
- **Global CDN**: Fast content delivery worldwide
- **Free Tier**: Generous free tier for hobby projects
- **Easy Database**: Vercel Postgres integration with one click

---

## Prerequisites

- [ ] GitHub account with your repository
- [ ] Vercel account (sign up at https://vercel.com)
- [ ] xAI API key from https://console.x.ai/

---

## 🎯 Quick Deployment (5 Minutes)

### Step 1: Import Your Project

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your GitHub repository: `Phazzie/WhispersAndFlames`
4. Click **"Import"**

### Step 2: Configure Your Project

Vercel will auto-detect Next.js. Just verify:

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./`
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm ci` (auto-detected)

### Step 3: Add Environment Variables

Click **"Environment Variables"** and add:

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `XAI_API_KEY` | `your_xai_api_key` | https://console.x.ai/ |
| `SESSION_SECRET` | `[random-32-chars]` | Run: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Leave empty for now | We'll set this after first deploy |

**Important**: Don't add `DATABASE_URL` yet - we'll set up the database next.

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait ~2 minutes for the build to complete
3. You'll get a URL like: `https://whispers-and-flames.vercel.app`

**Note**: The app will run in **in-memory mode** (no database) for now. Sessions won't persist. Let's add the database next!

---

## 🗄️ Setting Up Vercel Postgres

### Option 1: Via Dashboard (Recommended)

1. Go to your project dashboard
2. Click **"Storage"** tab
3. Click **"Create Database"**
4. Select **"Postgres"**
5. Choose a name: `whispers-flames-db`
6. Select region: **Same as your app** (usually `iad1`)
7. Click **"Create"**

Vercel will automatically:
- Create the database
- Add `POSTGRES_URL` and `DATABASE_URL` to your environment variables
- Trigger a new deployment with database enabled

### Option 2: Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link your project
vercel link

# Create Postgres database
vercel postgres create whispers-flames-db

# Connect database to your project
vercel env add DATABASE_URL
# Paste the connection string from the previous command

# Redeploy
vercel --prod
```

---

## 🔧 Update Your App URL

After your first deployment:

1. Copy your deployment URL (e.g., `https://whispers-and-flames.vercel.app`)
2. Go to **Settings** → **Environment Variables**
3. Add or update:
   ```
   NEXT_PUBLIC_APP_URL=https://whispers-and-flames.vercel.app
   ```
4. Click **"Redeploy"** from the **Deployments** tab

---

## ✅ Verification Checklist

After deployment, test these features:

- [ ] App loads at your Vercel URL
- [ ] Health check works: `https://your-app.vercel.app/api/health`
- [ ] Database health: `https://your-app.vercel.app/api/health/db`
- [ ] User signup and sign in
- [ ] Create a game room
- [ ] Join a game room
- [ ] Answer questions (tests AI integration)
- [ ] View session summary

---

## 🌐 Custom Domain (Optional)

### Add Your Domain

1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `whispersandflames.com`)
3. Follow Vercel's DNS instructions
4. Update environment variable:
   ```
   NEXT_PUBLIC_APP_URL=https://whispersandflames.com
   ```
5. Redeploy

Vercel automatically provisions SSL certificates!

---

## 📊 Understanding Your Backend on Vercel

Your app doesn't need a separate backend setup. Here's why:

### How It Works

| Component | What Happens on Vercel |
|-----------|------------------------|
| **Frontend** | Served from global CDN (fast!) |
| **API Routes** | Automatically become serverless functions |
| **Database** | Vercel Postgres (managed PostgreSQL) |
| **AI Calls** | Genkit flows run in serverless functions |
| **Sessions** | Stored in Postgres with HTTP-only cookies |

### API Routes → Serverless Functions

Your API routes in `src/app/api/` automatically become serverless functions:

```
/api/auth/signin        → Serverless function (on-demand)
/api/game/create        → Serverless function (on-demand)
/api/game/join          → Serverless function (on-demand)
/api/health             → Serverless function (on-demand)
```

**No server management needed!** Vercel handles:
- Auto-scaling (scales to zero when not in use)
- Global distribution
- Function optimization
- Cold start minimization

### Cost Implications

**Free Tier Includes:**
- 100 GB bandwidth per month
- 100 GB-hours of serverless function execution
- 1 GB of Postgres storage
- 60 compute hours per month

**When You Might Need Pro ($20/month):**
- More than 100 GB bandwidth
- Need more than 60 hours of compute time
- Want team collaboration features
- Need advanced analytics

**Postgres Pricing:**
- Hobby: Free (256 MB storage, 60 hours compute)
- Pro: $20/month (512 MB storage, included with Pro plan)

---

## 🔐 Security Best Practices

### Environment Variables

- ✅ **API Keys**: Automatically encrypted by Vercel
- ✅ **Session Secret**: Generate with `openssl rand -base64 32`
- ✅ **Database URL**: Auto-populated by Vercel Postgres
- ❌ **Never commit secrets** to Git (use `.env.local` locally)

### Security Headers

Already configured in `vercel.json`:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### Database Security

Vercel Postgres provides:
- Automatic SSL encryption
- Private connection strings
- Isolated databases per project
- Automatic backups (on paid plans)

---

## 🚨 Troubleshooting

### Build Fails

**Error**: `Type checking failed`
```bash
# This is expected - we skip type checking in builds
# Verify typescript: { ignoreBuildErrors: true } in next.config.mjs
```

**Error**: `Module not found: Can't resolve 'pg'`
```bash
# The app handles this gracefully
# If DATABASE_URL is set, pg will be installed automatically
# Otherwise, it uses in-memory storage
```

### API Routes Return 404

**Check**:
1. Files are in `src/app/api/` directory
2. Named `route.ts` (not `route.tsx`)
3. Export named functions: `GET`, `POST`, etc.

### Database Connection Fails

**Check**:
1. `DATABASE_URL` is set in environment variables
2. Vercel Postgres is in the same region as your app
3. Check logs: `vercel logs [deployment-url]`

**Test locally**:
```bash
# Install Vercel CLI
npm i -g vercel

# Pull environment variables
vercel env pull .env.local

# Run locally with production env
npm run dev
```

### AI Features Not Working

**Check**:
1. `XAI_API_KEY` is set correctly in Vercel environment variables
2. Check Vercel function logs for API errors
3. Verify API key has correct permissions at https://console.x.ai/

**Test API key**:
Visit https://console.x.ai/ and verify your API key is active and has sufficient credits.

### Cold Starts Are Slow

**Solutions**:
1. Upgrade to Vercel Pro (reduces cold starts)
2. Use Edge Functions for critical routes (add to vercel.json)
3. Implement route warming with cron jobs

---

## 📈 Monitoring & Analytics

### Built-in Vercel Analytics

1. Go to **Analytics** tab
2. View:
   - Page views
   - Top pages
   - User demographics
   - Performance metrics

### Viewing Logs

**Via Dashboard**:
1. Go to **Deployments**
2. Click on a deployment
3. Click **"View Function Logs"**

**Via CLI**:
```bash
# Real-time logs
vercel logs --follow

# Logs for specific deployment
vercel logs [deployment-url]
```

### Setting Up Alerts

1. Go to **Settings** → **Notifications**
2. Enable:
   - Deployment failures
   - Build errors
   - Performance alerts

---

## 🔄 Continuous Deployment

Vercel automatically deploys:

- **Production**: Every push to `main` branch
- **Preview**: Every push to other branches
- **Pull Requests**: Automatic preview deployments

### Branch Deployments

Your current branch `claude/switch-to-vercel-deployment-011CUvGSX2P11e1arsRb4HC3` will get a preview deployment:
```
https://whispers-and-flames-[branch-hash].vercel.app
```

### Deployment Protection (Pro)

Enable on the **Settings** → **Deployment Protection**:
- Password protection for preview deployments
- Vercel Authentication
- Trusted IP addresses

---

## 💰 Cost Comparison

| Platform | Setup Time | Monthly Cost | Database | Pros |
|----------|------------|--------------|----------|------|
| **Vercel** | 5 minutes | Free - $20 | Vercel Postgres | Zero config, auto-scaling, Next.js native |
| Digital Ocean | 15 minutes | $12 - $27 | Self-managed PG | Full control, predictable pricing |
| Netlify | 10 minutes | Free - $19 | BYO Database | Good for static, serverless functions |

**Recommendation**:
- **Hobby/MVP**: Vercel Free Tier (perfect for getting started!)
- **Production**: Vercel Pro ($20/mo) or Digital Ocean ($27/mo)

---

## 📚 Additional Resources

### Vercel Documentation
- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres
- Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables
- Serverless Functions: https://vercel.com/docs/concepts/functions/serverless-functions

### Next.js Documentation
- API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Environment Variables: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables

### Project Documentation
- Main README: [README.md](./README.md)
- Docker Deployment: [DEPLOYMENT_COMPLETE.md](./DEPLOYMENT_COMPLETE.md)
- Environment Variables: [.env.vercel](./.env.vercel)

---

## 🎉 Next Steps

After deployment:

1. [ ] Test all features thoroughly
2. [ ] Set up custom domain (optional)
3. [ ] Enable Vercel Analytics
4. [ ] Configure deployment protection
5. [ ] Set up monitoring and alerts
6. [ ] Review and optimize bundle size
7. [ ] Enable Web Vitals tracking

---

## ❓ Need Help?

**Vercel Support**:
- Community: https://github.com/vercel/vercel/discussions
- Documentation: https://vercel.com/docs
- Status: https://www.vercel-status.com

**Project Issues**:
- Check logs in Vercel dashboard
- Review API health endpoints
- Test database connectivity
- Verify environment variables

---

**Status**: ✅ **READY FOR VERCEL DEPLOYMENT**

Your app is fully configured and optimized for Vercel. Just follow the steps above and you'll be live in minutes!

🔥 Happy deploying! 💬
