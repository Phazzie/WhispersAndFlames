# Deployment Guide

## Prerequisites

1. **Firebase Project**: Set up a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. **Firebase App Hosting**: Enable Firebase App Hosting for your project
3. **Gemini/XAI API Key**: Get an API key from [Google AI Studio](https://aistudio.google.com) or xAI

## GitHub Secrets Configuration

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### Required Secrets:

- `XAI_API_KEY` or `GEMINI_API_KEY` - Your AI provider API key
- `NEXT_PUBLIC_APP_URL` - Your production URL (e.g., `https://your-app.web.app`)
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON (from Firebase console)
- `FIREBASE_PROJECT_ID` - Your Firebase project ID

### Getting Firebase Service Account:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Copy the entire JSON content
4. Paste as the value for `FIREBASE_SERVICE_ACCOUNT` secret

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and PR to `main`:

- Type checking
- Linting
- Unit tests
- Build verification
- E2E tests (on PRs with `e2e` label)

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

Deploys to production on push to `main`:

- Runs full CI pipeline
- Builds production bundle
- Deploys to Firebase App Hosting live channel

### 3. Preview Workflow (`.github/workflows/preview.yml`)

Creates preview deployments for PRs:

- Runs full CI pipeline
- Deploys to temporary Firebase preview channel
- Comments on PR with preview URL
- Expires after 7 days

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev

# Run tests
npm run test

# Run type checking
npm run typecheck

# Run linter
npm run lint
npm run lint:fix

# Build for production
npm run build
```

## Environment Variables

See `.env.example` for all required environment variables.

### Development:

- `XAI_API_KEY` - Your AI API key
- `NEXT_PUBLIC_APP_URL` - Local URL (default: `http://localhost:9002`)
- `NODE_ENV` - Set to `development`

### Production:

Set via GitHub Secrets (see above)

## Firebase App Hosting Configuration

The `apphosting.yaml` file configures your Firebase deployment:

```yaml
runConfig:
  maxInstances: 1 # Increase for more traffic
```

Adjust `maxInstances` based on expected traffic.

## Manual Deployment

If you need to deploy manually:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy
firebase deploy --only hosting
```

## Troubleshooting

### Build Fails

- Check that all environment variables are set
- Run `npm run typecheck` locally to catch type errors
- Run `npm run lint:fix` to auto-fix linting issues

### Deployment Fails

- Verify Firebase service account has correct permissions
- Check that `FIREBASE_PROJECT_ID` matches your project
- Ensure App Hosting is enabled in Firebase console

### Tests Fail in CI

- Check that tests pass locally first
- Verify Node version matches (20.x)
- Review test logs in GitHub Actions

## Monitoring

After deployment:

- Check Firebase Console for hosting metrics
- Monitor logs in Firebase Console → App Hosting → Logs
- Set up Firebase Performance Monitoring for detailed insights
