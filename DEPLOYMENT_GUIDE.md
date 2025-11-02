# Comprehensive Deployment Guide

This guide covers multiple deployment options for Whispers and Flames. Choose the platform that best fits your needs.

## Quick Comparison

| Platform          | Cost/Month    | Deployment Method | Best For                        |
| ----------------- | ------------- | ----------------- | ------------------------------- |
| **Netlify**       | Free - $19    | Git push          | Fastest setup, serverless       |
| **Digital Ocean** | $12 - $27     | Docker/Buildpack  | Full control, database included |
| **Vercel**        | Free - $20    | Git push          | Next.js optimized               |
| **Firebase**      | Pay as you go | Firebase CLI      | Google ecosystem                |

## Prerequisites

All deployment options require:

- Node.js 20.x
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)
- Git repository on GitHub

---

## Option 1: Netlify (Recommended for Quick Start)

### Why Netlify?

- ✅ Zero configuration deployment
- ✅ Automatic HTTPS
- ✅ Free tier available
- ✅ Edge functions for serverless API routes
- ⚠️ Uses in-memory storage (data resets on redeploy)

### Deployment Steps

1. **Install Netlify CLI** (optional, for local testing):

   ```bash
   npm install -g netlify-cli
   ```

2. **Connect Repository**:
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Netlify will auto-detect Next.js configuration

3. **Configure Environment Variables**:
   In Netlify dashboard → Site settings → Environment variables:

   ```
   GEMINI_API_KEY=your_api_key_here
   NEXT_PUBLIC_APP_URL=https://your-site-name.netlify.app
   NODE_ENV=production
   ```

4. **Deploy**:
   - Netlify will automatically deploy on every push to main branch
   - Build command: `npm run build`
   - Publish directory: `.next`

### Local Testing with Netlify

```bash
# Link to Netlify site
netlify link

# Test functions locally
netlify dev

# Deploy preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Netlify Configuration

The included `netlify.toml` configures:

- Next.js plugin for optimal performance
- Security headers
- API route handling
- Cache optimization

---

## Option 2: Digital Ocean (Recommended for Production)

### Why Digital Ocean?

- ✅ PostgreSQL database included
- ✅ Persistent data storage
- ✅ Predictable pricing
- ✅ Full server control
- ⚠️ Requires more setup

### Deployment Steps

#### Via Dashboard (Easiest)

1. **Create App**:
   - Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Connect GitHub repository
   - Select branch: `main`
   - Enable auto-deploy

2. **Configure Build**:
   - Build Command: `npm run build`
   - Run Command: `npm start`
   - HTTP Port: `3000`
   - Dockerfile path: `Dockerfile`

3. **Add Database**:
   - Click "Add Resource" → "Database"
   - Choose PostgreSQL 16
   - Select tier (Dev: $7/month, Prod: $15/month)
   - Connection string auto-injected as `DATABASE_URL`

4. **Set Environment Variables**:

   ```
   GEMINI_API_KEY=your_api_key_here
   SESSION_SECRET=<generate_32_char_random_string>
   NEXT_PUBLIC_APP_URL=${APP_URL}
   STORAGE_MODE=postgres
   NODE_ENV=production
   NPM_CONFIG_PRODUCTION=false (scope: BUILD_TIME)
   ```

   Generate SESSION_SECRET:

   ```bash
   openssl rand -base64 32
   ```

5. **Choose Resources**:
   - Basic ($5/month): 512MB RAM - testing
   - Professional ($12/month): 1GB RAM - recommended

6. **Deploy**:
   - Click "Create Resources"
   - Wait 5-10 minutes for first deployment
   - App available at: `https://your-app.ondigitalocean.app`

#### Via CLI (Advanced)

```bash
# Install doctl
brew install doctl  # macOS
# or download from https://docs.digitalocean.com/reference/doctl/how-to/install/

# Authenticate
doctl auth init

# Deploy using app spec
doctl apps create --spec .do/app.yaml

# Get app ID
doctl apps list

# Monitor deployment
doctl apps logs <APP_ID> --type BUILD --follow
```

### Cost Breakdown

**Minimal Setup**: ~$12/month

- App: $5/month (Basic XXS)
- Database: $7/month (Dev tier)

**Production Setup**: ~$27/month

- App: $12/month (Professional)
- Database: $15/month (with backups)

---

## Option 3: Vercel

### Why Vercel?

- ✅ Built by Next.js creators
- ✅ Excellent performance
- ✅ Simple deployment
- ⚠️ In-memory storage only

### Deployment Steps

1. **Install Vercel CLI**:

   ```bash
   npm install -g vercel
   ```

2. **Deploy**:

   ```bash
   vercel
   ```

3. **Set Environment Variables**:

   ```bash
   vercel env add GEMINI_API_KEY production
   vercel env add NEXT_PUBLIC_APP_URL production
   ```

4. **Configure**:
   The `vercel.json` file is already configured with:
   - Build command
   - Output directory
   - Environment variables

---

## Option 4: Firebase App Hosting

### Why Firebase?

- ✅ Google Cloud integration
- ✅ Generous free tier
- ✅ Global CDN
- ⚠️ In-memory storage

See [docs/deployment.md](./docs/deployment.md) for detailed Firebase instructions.

---

## Environment Variables Reference

### Required for All Platforms

| Variable              | Description            | Example                   |
| --------------------- | ---------------------- | ------------------------- |
| `GEMINI_API_KEY`      | Google Gemini API key  | `AIza...`                 |
| `NEXT_PUBLIC_APP_URL` | Public URL of your app | `https://app.example.com` |
| `NODE_ENV`            | Environment mode       | `production`              |

### Optional (for PostgreSQL)

| Variable         | Description                  | Example                               |
| ---------------- | ---------------------------- | ------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `STORAGE_MODE`   | Storage backend              | `postgres` or `memory`                |
| `SESSION_SECRET` | Session encryption key       | `<32_char_random_string>`             |

---

## Post-Deployment Checklist

After deploying to any platform:

- [ ] Test health endpoint: `https://your-app.com/api/health`
- [ ] Verify environment variables are set
- [ ] Test user registration/login
- [ ] Create a test game
- [ ] Check API rate limiting
- [ ] Monitor logs for errors
- [ ] Set up custom domain (optional)
- [ ] Configure monitoring/alerts

---

## Database Setup (For PostgreSQL Deployments)

### Initial Schema

The app automatically creates tables on first run. Tables created:

- `users` - User accounts
- `games` - Game sessions
- `sessions` - User sessions

### Backup & Restore

**Digital Ocean**:

```bash
# List backups
doctl databases backups list <DB_ID>

# Create backup
doctl databases backups create <DB_ID>
```

---

## Troubleshooting

### Build Fails

**Symptom**: Build fails with TypeScript or lint errors

**Solution**:

```bash
# Run locally first
npm run typecheck
npm run lint:fix
npm run build
```

### App Crashes on Start

**Symptom**: App starts but immediately crashes

**Solution**:

- Check logs for missing environment variables
- Verify `GEMINI_API_KEY` is set
- For PostgreSQL: verify `DATABASE_URL` is correct

### Database Connection Fails

**Symptom**: "Failed to connect to PostgreSQL"

**Solution**:

- Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/db`
- Check database is running
- Verify network access (firewall rules)

### 502 Bad Gateway

**Symptom**: Nginx/proxy error on platform

**Solution**:

- Check app is listening on correct port (3000)
- Verify health check endpoint works
- Check app logs for startup errors

---

## Performance Optimization

### Caching

The app includes:

- Next.js automatic static optimization
- API route caching for static data
- Client-side state caching

### Scaling

**Netlify/Vercel**: Automatic scaling (serverless)

**Digital Ocean**:

```bash
# Scale instances
doctl apps update <APP_ID> --instance-count 2
```

### Monitoring

- Set up platform-specific monitoring
- Monitor `/api/health` endpoint
- Track response times
- Watch for memory leaks

---

## Security Considerations

### API Keys

- ✅ Never commit API keys to Git
- ✅ Use environment variables
- ✅ Rotate keys periodically
- ✅ Use different keys for dev/prod

### Sessions

- ✅ Use strong SESSION_SECRET (32+ characters)
- ✅ Enable HTTPS (automatic on all platforms)
- ✅ Set secure cookie flags

### Headers

Security headers are configured in:

- `middleware.ts` for all platforms
- `netlify.toml` for Netlify
- Platform settings for others

---

## Getting Help

### Platform-Specific Docs

- **Netlify**: [docs.netlify.com](https://docs.netlify.com)
- **Digital Ocean**: [docs.digitalocean.com](https://docs.digitalocean.com)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Firebase**: [firebase.google.com/docs](https://firebase.google.com/docs)

### Project Resources

- [README.md](./README.md) - Project overview
- [DOCKER.md](./DOCKER.md) - Docker setup
- [.do/deploy.md](./.do/deploy.md) - Digital Ocean details

---

## Cost Comparison (Monthly)

### Free Tier Options

- **Netlify**: 100GB bandwidth, 300 build minutes
- **Vercel**: 100GB bandwidth, serverless functions
- **Firebase**: 10GB storage, 360MB/day network

### Paid Options

| Platform      | Entry Tier    | Production Tier   |
| ------------- | ------------- | ----------------- |
| Netlify       | $19/month     | $99/month (Pro)   |
| Digital Ocean | $12/month     | $27/month         |
| Vercel        | $20/month     | $150/month (Team) |
| Firebase      | Pay-as-you-go | Pay-as-you-go     |

**Recommendation**:

- **Learning/Testing**: Netlify Free or Vercel Free
- **Small Production**: Digital Ocean ($12-27/month)
- **Scale**: Netlify Pro or Vercel Pro

---

Made with 🔥 and 💬 by the Whispers and Flames team
