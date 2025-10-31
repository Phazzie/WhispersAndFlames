# Docker Setup & Deployment Guide

## ✅ Dockerfile Audit Complete

The Dockerfile has been audited and optimized with:

- ✅ **Alpine Linux** (node:20-alpine) - smallest, most secure base
- ✅ **Multi-stage build** - reduces final image size by ~70%
- ✅ **Non-root user** - runs as `nextjs` user for security
- ✅ **Health checks** - automatic container health monitoring
- ✅ **Production optimized** - standalone Next.js output
- ✅ **Build arguments** - supports environment variables

---

## 🧪 Test Locally First

### 1. Copy environment file

```bash
cp .env.docker.example .env.docker
```

### 2. Edit with your values

```bash
nano .env.docker
```

Required values:

- `GEMINI_API_KEY` - Your Gemini API key
- `POSTGRES_PASSWORD` - Choose a secure password
- `SESSION_SECRET` - Generate: `openssl rand -base64 32`

### 3. Build and run

```bash
# Build and start all services (app + PostgreSQL)
docker-compose --env-file .env.docker up --build

# Or run in background
docker-compose --env-file .env.docker up -d --build
```

### 4. Test the app

```bash
# Open in browser
open http://localhost:3000

# Check health endpoint
curl http://localhost:3000/api/health

# View logs
docker-compose logs -f web
```

### 5. Stop services

```bash
docker-compose down

# Remove volumes too (clears database)
docker-compose down -v
```

---

## 🚀 Deploy to Digital Ocean

### Quick Deploy (Dashboard - Recommended)

1. **Go to**: https://cloud.digitalocean.com/apps
2. **Click**: "Create App"
3. **Choose**: GitHub → `Phazzie/WhispersAndFlames` → `main` branch
4. **Enable**: Autodeploy on push
5. **Add Database**: PostgreSQL 16 (auto-connects as `DATABASE_URL`)
6. **Set Secrets** (in Environment Variables):
   ```
   GEMINI_API_KEY = your_api_key
   SESSION_SECRET = generate_with_openssl_rand_-base64_32
   ```
7. **Choose Plan**: Basic ($5/month) or Professional ($12/month)
8. **Deploy**: Click "Create Resources"

Your app will be live in ~5 minutes at: `https://whispers-and-flames.ondigitalocean.app`

### Advanced Deploy (CLI)

See `.do/deploy.md` for complete CLI instructions.

---

## 📊 Cost Estimates

### Testing/Development

- **App**: $5/month (Basic XXS - 512MB RAM)
- **Database**: $7/month (Dev tier)
- **Total**: ~$12/month

### Production

- **App**: $12/month (Basic XS - 1GB RAM)
- **Database**: $15/month (Prod tier with backups)
- **Total**: ~$27/month

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Generate strong `SESSION_SECRET` (32+ chars)
- [ ] Use encrypted environment variables in DO
- [ ] Enable production database tier (automatic backups)
- [ ] Update `NEXT_PUBLIC_APP_URL` to your domain
- [ ] Set up monitoring and alerts in DO dashboard
- [ ] Test health check endpoint works
- [ ] Review logs after first deployment

---

## 🛠️ Common Commands

### Local Docker Development

```bash
# Rebuild after code changes
docker-compose up --build

# View logs
docker-compose logs -f

# Access database
docker-compose exec postgres psql -U postgres -d whispers_flames

# Clean everything
docker-compose down -v
docker system prune -a
```

### Digital Ocean Management

```bash
# List apps
doctl apps list

# View logs
doctl apps logs YOUR_APP_ID --type RUN --follow

# Trigger deployment
doctl apps create-deployment YOUR_APP_ID

# Update environment variable
doctl apps update YOUR_APP_ID --env KEY=value
```

---

## 🐛 Troubleshooting

### Build fails with type errors

The Dockerfile skips type checking (validated in CI). If you want strict checking:

```bash
npm run typecheck
npm run lint
```

### Health check fails

- Check if `/api/health` exists and returns 200
- Increase `initial_delay_seconds` in `.do/app.yaml`
- View logs: `docker-compose logs web`

### Database connection issues

- Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/dbname`
- Check if PostgreSQL is running: `docker-compose ps`
- Test connection: `docker-compose exec postgres psql -U postgres`

### App crashes on startup

```bash
# Check logs
docker-compose logs web

# Common issues:
# - Missing GEMINI_API_KEY
# - Invalid environment variables
# - Port 3000 already in use
```

---

## 📚 Additional Resources

- **Digital Ocean Docs**: https://docs.digitalocean.com/products/app-platform/
- **Next.js Docker**: https://nextjs.org/docs/deployment#docker-image
- **Docker Best Practices**: https://docs.docker.com/develop/dev-best-practices/

---

## ✨ What's Next?

1. ✅ Test locally with `docker-compose`
2. ✅ Deploy to Digital Ocean
3. ✅ Configure custom domain (optional)
4. ✅ Set up monitoring
5. ✅ Share your app! 🔥

Need help? Check `.do/deploy.md` for detailed instructions.
