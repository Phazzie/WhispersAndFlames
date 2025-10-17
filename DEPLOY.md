# Deployment Guide

## DigitalOcean App Platform

This application is configured to deploy to DigitalOcean's App Platform.

### Prerequisites

1. Install `doctl` (DigitalOcean CLI):

   ```bash
   # macOS
   brew install doctl

   # Linux
   cd ~
   wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
   tar xf ~/doctl-1.104.0-linux-amd64.tar.gz
   sudo mv ~/doctl /usr/local/bin
   ```

2. Authenticate with DigitalOcean:
   ```bash
   doctl auth init
   ```

### Deployment

1. Create the app from the spec file:

   ```bash
   doctl apps create --spec .do/app.yaml
   ```

2. Get your app ID:

   ```bash
   doctl apps list
   ```

3. Set the required secrets:

   ```bash
   doctl apps update <APP_ID> --spec .do/app.yaml
   ```

   Then set the `XAI_API_KEY` secret in the DigitalOcean dashboard.

### Updating the App

To update an existing app:

```bash
doctl apps update <APP_ID> --spec .do/app.yaml
```

### Monitoring

View logs:

```bash
doctl apps logs <APP_ID>
```

Get app info:

```bash
doctl apps get <APP_ID>
```

### Environment Variables

Required environment variables:

- `XAI_API_KEY` - Your AI API key (set as secret)
- `NODE_ENV` - Set to `production`
- `NEXT_PUBLIC_APP_URL` - Auto-set to `${APP_URL}` by the platform

### Limitations

- Single instance deployment (no horizontal scaling)
- In-memory storage (data is ephemeral, sessions and games reset on restart)
- Rate limiting is per-instance
- No database persistence - all data stored in server memory

### Health Check

The app exposes a health endpoint at `/api/health` that returns:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "time": "2024-01-01T00:00:00.000Z"
}
```
