# Whispers and Flames

An intimate conversation experience designed to foster deeper connections through AI-guided questions.

## 🔥 Overview

Whispers and Flames creates a safe, private space for couples to explore their relationship through thoughtful, context-aware questions. Players select categories and "spicy levels," then answer AI-generated questions designed to spark meaningful conversations.

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

   Edit `.env.local` and add your API keys:

   ```
   XAI_API_KEY=your_api_key_here
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
- **Backend**: In-memory storage with session-based authentication
- **AI**: Google's Gemini via Genkit
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

| Variable              | Required | Default                 | Description                  |
| --------------------- | -------- | ----------------------- | ---------------------------- |
| `XAI_API_KEY`         | No       | -                       | API key for AI services      |
| `GEMINI_API_KEY`      | No       | -                       | Alternative API key (legacy) |
| `NODE_ENV`            | No       | `development`           | Environment mode             |
| `NEXT_PUBLIC_APP_URL` | No       | `http://localhost:9002` | Public app URL               |

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

This application is configured for deployment to DigitalOcean App Platform.

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.

### Quick Deploy

```bash
doctl apps create --spec .do/app.yaml
```

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

- **Storage**: In-memory only (no database, data resets on restart)
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
