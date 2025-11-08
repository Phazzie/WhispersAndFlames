# Whispers and Flames

An intimate conversation experience designed to foster deeper connections through AI-guided questions.

## 🔥 Overview

Whispers and Flames creates a safe, private space for couples to explore their relationship through thoughtful, context-aware questions. Players select categories and "spicy levels," then answer AI-generated questions designed to spark meaningful conversations.

### ✨ Key Features

- **AI-Powered Questions**: Contextual questions that adapt to your choices and conversation flow
- **Personality-Driven Achievements**: Unlock playful achievements with descriptions that match our witty, intimate tone:
  - 🏆 **Heart-Thrower**: "Lobbed their heart into the ring and it stuck — brave, bright, and beautifully unignorable."
  - 🎨 **Plot-Twist Picasso**: "Painted the conversation with a left-field brushstroke — deliciously unpredictable."
  - 😉 **Telepathic Wink**: "Finished each other's sentences like a psychic sitcom — eerie, delightful, and slightly illegal in three states."
- **Therapist's Notes**: Get insights from "Dr. Ember" with professional observations delivered with playful wit
- **Visual Memories**: AI-generated abstract art based on your session's emotional themes
- **Chaos Mode**: Random spicy level upgrades for the adventurous

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x (we recommend using [nvm](https://github.com/nvm-sh/nvm))
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Phazzie/WhispersAndFlames.git
   cd WhispersAndFlames
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your XAI API key:

   ```
   XAI_API_KEY=your_xai_api_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:9002
   NODE_ENV=development
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:9002](http://localhost:9002) in your browser

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: PostgreSQL or in-memory storage with session-based authentication
- **AI**: xAI Grok via Genkit
- **Testing**: Vitest (unit/integration), Playwright (e2e)
- **Linting**: ESLint + Prettier

## 🛠️ Development Scripts

```bash
# Development
npm run dev              # Start dev server on port 9002
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run typecheck        # Run TypeScript type checking
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run format           # Format code with Prettier

# Testing
npm run test             # Run unit/integration tests
npm run test:ui          # Run tests with Vitest UI
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run Playwright e2e tests

# AI Development (Genkit)
npm run genkit:dev       # Start Genkit developer UI
npm run genkit:watch     # Start Genkit with watch mode
```

## 🔐 Environment Variables

| Variable              | Required | Default                 | Description                |
| --------------------- | -------- | ----------------------- | -------------------------- |
| `XAI_API_KEY`         | Yes      | -                       | xAI API key (console.x.ai) |
| `DATABASE_URL`        | No       | -                       | Postgres connection string |
| `NODE_ENV`            | No       | `development`           | Environment mode           |
| `NEXT_PUBLIC_APP_URL` | No       | `http://localhost:9002` | Public app URL             |

## 🧪 Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Environment validation, utilities, rate limiting
- **Integration Tests**: Game services, auth services, database adapters
- **E2E Tests**: User flows, error handling, accessibility

Run specific test suites:

```bash
npm run test              # All unit/integration tests
npm run test:e2e          # End-to-end tests only
npm run test:coverage     # Generate coverage report
```

## 🚢 Deployment

### Vercel (Recommended)

The easiest way to deploy this Next.js app. **Zero configuration required!**

**Quick Start:**

1. Push to GitHub
2. Import to Vercel: https://vercel.com/new
3. Add environment variables (see `.env.vercel`)
4. Deploy! 🚀

**Documentation:**

- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Complete Vercel deployment guide
- **[.env.vercel](./.env.vercel)** - Environment variables template

**Cost:** Free tier available, Pro starts at $20/month

### Docker + Digital Ocean (Alternative)

For those who prefer containerized deployments with full control.

**Quick Start:**

```bash
# Test locally with Docker
docker-compose --env-file .env.docker up --build

# Deploy to Digital Ocean (via dashboard)
# See: https://cloud.digitalocean.com/apps
```

**Documentation:**

- **[DOCKER.md](./DOCKER.md)** - Docker setup, local testing, troubleshooting
- **[.do/deploy.md](./.do/deploy.md)** - Complete Digital Ocean deployment guide
- **[DEPLOY.md](./DEPLOY.md)** - Alternative deployment options

**Cost:** Starting at ~$12/month (app + database)

## 📊 Architecture

### Project Structure

```
src/
├── app/              # Next.js app router pages
│   ├── game/        # Game flow pages and actions
│   ├── profile/     # User profile page
│   └── api/         # API routes (health check)
├── components/      # React components
│   └── ui/          # shadcn/ui components
├── lib/             # Utilities and types
│   ├── constants.ts # Game constants
│   ├── env.ts       # Environment validation
│   ├── game-types.ts # Type definitions
│   ├── storage.ts   # Storage interface
│   ├── storage-adapter.ts # Storage adapter
│   ├── storage-memory.ts # In-memory storage
│   ├── storage-pg.ts # PostgreSQL storage
│   └── utils/       # Utility functions
├── ai/              # AI flows and prompts (DO NOT MODIFY)
│   └── flows/       # Genkit AI flows
└── middleware.ts    # Security headers middleware
```

### Security Features

- **Rate Limiting**: 30 requests per minute per IP (in-memory)
- **Security Headers**: X-Frame-Options, Referrer-Policy, CSP
- **Input Validation**: Zod schema validation on all API routes
- **Environment Validation**: Type-safe environment configuration
- **Session-Based Auth**: HTTP-only cookies with 7-day expiration

## ⚠️ Known Limitations

- **Storage**: Data resets on restart when using in-memory storage
- **Sessions**: Session-based authentication (stored in memory)
- **Scaling**: No horizontal scaling support - single instance only
- **Rate Limiting**: Per-instance only (not distributed)
- **Network**: Google Fonts may fail in restricted environments
- **Real-time Updates**: Uses polling (2-second intervals) instead of WebSockets

## 📝 Contributing

1. Ensure all tests pass: `npm run test`
2. Check types: `npm run typecheck`
3. Lint your code: `npm run lint:fix`
4. Format code: `npm run format`
5. Pre-commit hooks will run automatically

## 📄 License

This project is private and proprietary.

## 🔗 Links

- [Changelog](./CHANGELOG.md)
- [Deployment Guide](./DEPLOY.md)
- [Agent Instructions](./agents.md)

---

Made with 🔥 and 💬 by the Whispers and Flames team
