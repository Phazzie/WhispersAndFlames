# CLAUDE.md - AI Assistant Guide for Whispers and Flames

> **Last Updated:** 2025-11-13
> **Project:** Whispers and Flames - An intimate conversation experience for couples
> **Version:** 0.1.0

This document provides comprehensive guidance for AI assistants (like Claude) working on this codebase. It covers architecture, conventions, workflows, and best practices.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Key Architectural Patterns](#key-architectural-patterns)
5. [Development Workflows](#development-workflows)
6. [Code Conventions](#code-conventions)
7. [Testing Strategy](#testing-strategy)
8. [Deployment](#deployment)
9. [Security Considerations](#security-considerations)
10. [Common Tasks](#common-tasks)
11. [Important Files Reference](#important-files-reference)
12. [Things to Avoid](#things-to-avoid)

---

## Project Overview

**Whispers and Flames** is a Next.js-based multiplayer game designed for couples to explore intimacy through AI-guided conversations. Players:

1. Create or join a game room via unique room codes
2. Select conversation categories (e.g., "Hidden Attractions", "Power Play")
3. Choose a "spicy level" (Mild, Medium, Hot, Extra-Hot)
4. Answer AI-generated contextual questions
5. Receive personalized summaries and insights

### Core Features

- **AI-Powered Questions**: Google Gemini via Genkit generates contextual questions
- **Authentication**: Clerk for user management and session protection
- **Database**: PostgreSQL with automatic in-memory fallback for development
- **Real-time Updates**: Polling-based game state synchronization (2s intervals)
- **Achievements**: Personality-driven achievement system with witty descriptions
- **Visual Memories**: AI-generated abstract art based on session themes
- **Chaos Mode**: Random spicy level upgrades for adventurous players

### Game Flow

```
Home → Create/Join Game → Lobby → Categories → Spicy Level → Game (Q&A) → Summary
```

Each step is a separate component in `src/app/game/[roomCode]/steps/`

---

## Technology Stack

### Core Framework

- **Next.js 15.5.6** - App Router (not Pages Router)
- **React 18.3.1** - Server Components by default, Client Components marked with `'use client'`
- **TypeScript 5** - Strict mode enabled
- **Node.js 20.x** - Required version (enforced in package.json)

### Styling

- **Tailwind CSS 3.4.1** - Utility-first CSS
- **shadcn/ui** - Pre-built components based on Radix UI
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animations
- **Lucide React** - Icon library

### AI/ML

- **Genkit 1.14.1** - Google's AI framework for flows
- **@genkit-ai/googleai** - Google Gemini 2.5 Flash integration
- **XAI API** - Primary AI provider (requires `XAI_API_KEY`)

### Database & Storage

- **PostgreSQL (pg 8.16.3)** - Primary database
- **In-Memory Fallback** - Development mode when `DATABASE_URL` is not set
- **Storage Adapter Pattern** - Abstraction layer for easy switching

### Authentication

- **Clerk (@clerk/nextjs 6.35.1)** - User authentication and management
- **Middleware-based protection** - Route-level authorization

### Testing

- **Vitest 4.0.6** - Unit and integration tests
- **Playwright 1.56.1** - End-to-end tests
- **@testing-library/react** - Component testing utilities
- **jsdom** - Browser environment simulation

### Development Tools

- **ESLint 9.38.0** - Code linting
- **Prettier 3.6.2** - Code formatting
- **Husky 9.1.7** - Git hooks
- **lint-staged** - Pre-commit formatting
- **Genkit CLI** - AI flow development and debugging

### Validation & Forms

- **Zod 3.24.2** - Schema validation
- **React Hook Form 7.54.2** - Form state management
- **@hookform/resolvers** - Zod integration

---

## Directory Structure

```
WhispersAndFlames/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Home page (authenticated)
│   │   ├── layout.tsx                # Root layout with ClerkProvider
│   │   ├── game/
│   │   │   ├── [roomCode]/           # Dynamic game routes
│   │   │   │   ├── page.tsx          # Main game page (client component)
│   │   │   │   ├── game-layout.tsx   # Game UI wrapper with progress
│   │   │   │   └── steps/            # Game step components
│   │   │   │       ├── lobby-step.tsx
│   │   │   │       ├── categories-step.tsx
│   │   │   │       ├── spicy-step.tsx
│   │   │   │       ├── game-step.tsx      # Q&A round
│   │   │   │       └── summary-step.tsx   # Results & analysis
│   │   │   └── actions.ts            # Server actions for AI operations
│   │   ├── api/                      # API routes
│   │   │   ├── game/
│   │   │   │   ├── create/route.ts   # POST: Create game
│   │   │   │   ├── join/route.ts     # POST: Join game
│   │   │   │   ├── update/route.ts   # POST: Update game state
│   │   │   │   └── [roomCode]/route.ts # GET: Fetch game state
│   │   │   ├── health/               # Health check endpoints
│   │   │   │   ├── route.ts          # Basic health
│   │   │   │   └── db/route.ts       # Database health metrics
│   │   │   └── cron/
│   │   │       └── cleanup/route.ts  # DELETE: Expire old games (Vercel Cron)
│   │   ├── profile/page.tsx          # User profile
│   │   └── prototype/page.tsx        # Development/testing
│   │
│   ├── components/                   # React components
│   │   ├── home-page.tsx             # Home page logic (client)
│   │   ├── qr-code-share.tsx         # QR code sharing
│   │   ├── game-layout.tsx           # Game UI container
│   │   ├── error-boundary.tsx        # Error handling wrapper
│   │   ├── icons/                    # Logo component
│   │   └── ui/                       # shadcn/ui components
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-mobile.tsx            # Responsive breakpoint detection
│   │   └── use-toast.ts              # Toast notification system
│   │
│   ├── lib/                          # Core business logic
│   │   ├── game-types.ts             # TypeScript type definitions
│   │   ├── constants.ts              # Categories & spicy levels
│   │   ├── game-utils.ts             # Room code generation, chaos mode
│   │   ├── env.ts                    # Environment validation (Zod)
│   │   ├── storage-adapter.ts        # DB abstraction layer
│   │   ├── storage-pg.ts             # PostgreSQL implementation
│   │   ├── storage-memory.ts         # In-memory fallback
│   │   ├── client-game.ts            # Client-side API wrapper
│   │   ├── image-generation.ts       # Visual memory generation
│   │   ├── achievements.ts           # Achievement system
│   │   ├── player-validation.ts      # Input sanitization
│   │   ├── api-constants.ts          # API rate limit configs
│   │   └── utils/
│   │       ├── security.ts           # XSS prevention, HTML sanitization
│   │       ├── rate-limiter.ts       # Request rate limiting
│   │       ├── logger.ts             # Structured logging
│   │       └── db-health.ts          # Database health checks
│   │
│   ├── ai/                           # AI/Genkit flows (CRITICAL - DO NOT MODIFY CASUALLY)
│   │   ├── genkit.ts                 # Genkit configuration
│   │   ├── dev.ts                    # Development server
│   │   └── flows/
│   │       ├── generate-contextual-questions.ts
│   │       ├── analyze-answers-and-generate-summary.ts
│   │       ├── generate-therapist-notes.ts
│   │       ├── generate-visual-memory.ts
│   │       └── shared-utils.ts       # Prompt injection prevention
│   │
│   ├── __tests__/                    # Unit tests
│   │   ├── lib/                      # Library tests
│   │   └── utils/                    # Utility tests
│   │
│   └── middleware.ts                 # Clerk auth + security headers
│
├── e2e/                              # Playwright E2E tests
├── public/                           # Static assets
├── docs/                             # Documentation
│
├── Configuration Files:
│   ├── package.json                  # Dependencies & scripts
│   ├── tsconfig.json                 # TypeScript config
│   ├── next.config.mjs               # Next.js configuration
│   ├── vercel.json                   # Vercel deployment config
│   ├── vitest.config.ts              # Unit test config
│   ├── playwright.config.ts          # E2E test config
│   ├── tailwind.config.ts            # Tailwind CSS config
│   ├── .eslintrc.cjs                 # ESLint rules
│   ├── .prettierrc                   # Prettier formatting
│   └── .env.example                  # Environment template
```

---

## Key Architectural Patterns

### 1. Storage Adapter Pattern

**Purpose:** Abstract database operations to support multiple storage backends

**Implementation:**

```typescript
// src/lib/storage-adapter.ts
if (process.env.DATABASE_URL) {
  storage = pgModule.storage; // PostgreSQL
} else {
  storage = memoryStorage; // In-memory fallback
}
```

**Benefits:**

- Development without PostgreSQL setup
- Easy testing with in-memory storage
- Production uses battle-tested PostgreSQL
- Single interface for all database operations

**Interface:** `StorageAdapter` in `src/lib/storage-adapter.ts`

### 2. Server Actions for AI Operations

**Pattern:** Next.js Server Actions for AI flows

**Location:** `src/app/game/actions.ts`

**Key Actions:**

- `generateQuestionAction()` - Fetches AI-generated questions
- `analyzeAndSummarizeAction()` - Generates session summaries
- `generateTherapistNotesAction()` - Creates therapist insights
- `generateVisualMemoryAction()` - Generates visual art prompts

**Usage:**

```typescript
'use server';

export async function generateQuestionAction(input: QuestionInput) {
  // Runs on server, callable from client
  // Includes retry logic and timeout handling
}
```

### 3. Prompt Injection Prevention

**Pattern:** Input sanitization before AI processing

**Location:** `src/ai/flows/shared-utils.ts`

**Functions:**

- `sanitizeArray()` - Validates and sanitizes arrays
- `validateCategories()` - Whitelist-based validation
- `validateSpicyLevel()` - Enum validation
- `truncateString()` - Prevents DoS via long inputs

**Always use these utilities when passing user input to AI flows.**

### 4. Race Condition Prevention (PostgreSQL)

**Pattern:** Row-level locking for concurrent updates

**Example:**

```typescript
await client.query('BEGIN');
await client.query('SELECT ... FROM games WHERE room_code = $1 FOR UPDATE', [roomCode]);
// ... perform updates ...
await client.query('COMMIT');
```

**Critical for:** Game state updates when multiple players update simultaneously

### 5. Component Architecture

**Server Components (Default):**

- Layouts (`layout.tsx`)
- Static pages
- API routes

**Client Components (`'use client'`):**

- All game step components
- Interactive UI (forms, buttons with state)
- Components using hooks

**Rule:** Only mark as client component if it:

- Uses React hooks (`useState`, `useEffect`, etc.)
- Handles browser events
- Uses client-only APIs

### 6. Rate Limiting Strategy

**Pattern:** Deterministic in-memory rate limiting

**Location:** `src/lib/utils/rate-limiter.ts`

**Configuration:** `src/lib/api-constants.ts`

**Limits:**

- Create game: 10 requests/min
- Join game: 20 requests/min
- Update game: 60 requests/min

**Cleanup:** Time-based cleanup every 60 seconds (not probabilistic)

### 7. Error Handling Layers

**Layer 1: Client-Side**

```typescript
try {
  await updateGameState(newState);
} catch (error) {
  toast({ title: 'Error', description: error.message, variant: 'destructive' });
}
```

**Layer 2: API Routes**

```typescript
try {
  // ... operation ...
} catch (error) {
  logger.error('Operation failed', error, { context });
  return NextResponse.json({ error: 'Message' }, { status: 500 });
}
```

**Layer 3: Database**

- Transaction rollback on errors
- Connection retry with exponential backoff
- Query timeout enforcement (10s)

### 8. Type-Safe Environment Variables

**Pattern:** Runtime validation with Zod

**Location:** `src/lib/env.ts`

**Required Variables:**

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication (required)
- `CLERK_SECRET_KEY` - Clerk authentication (required)
- `XAI_API_KEY` or `GEMINI_API_KEY` - At least one AI provider (optional)
- `DATABASE_URL` - PostgreSQL connection (optional, falls back to in-memory)
- `NEXT_PUBLIC_APP_URL` - Application URL (defaults to localhost:9002)

**Usage:**

```typescript
import { env } from '@/lib/env';

const apiKey = env.XAI_API_KEY; // Type-safe, validated at startup
const clerkKey = env.CLERK_SECRET_KEY; // Required, validated at startup
```

**Never use `process.env.VARIABLE` directly** - always use validated `env` object.

**Validation:** App will fail to start with clear error message if required keys are missing.

---

## Development Workflows

### Starting Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Start dev server
npm run dev

# 4. Open http://localhost:9002
```

### Running Tests

```bash
# Unit tests (watch mode)
npm run test

# Unit tests with UI
npm run test:ui

# Coverage report
npm run test:coverage

# E2E tests (requires dev server running)
npm run test:e2e
```

### AI Flow Development

```bash
# Start Genkit developer UI
npm run genkit:dev

# Visit http://localhost:4000 to test AI flows
```

**Genkit UI allows:**

- Testing flows with custom inputs
- Viewing flow execution traces
- Debugging prompt responses
- Inspecting flow performance

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

### Git Workflow

1. **Pre-commit hooks** (Husky + lint-staged):
   - Auto-formats `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.md`
   - Runs on staged files only

2. **Commit messages**: Use conventional commits

   ```
   feat: Add chaos mode to spicy level selection
   fix: Prevent race condition in game state updates
   docs: Update CLAUDE.md with new patterns
   ```

3. **Branch strategy**:
   - `main` - Production-ready code
   - Feature branches: `feature/description`
   - Bug fixes: `fix/description`

### Building for Production

```bash
# Build
npm run build

# Test production build locally
npm run start
```

**Build checks:**

- TypeScript: No errors allowed
- ESLint: No errors allowed
- All tests pass

---

## Code Conventions

### TypeScript

1. **Strict mode enabled** - No implicit `any`, null checks required
2. **Use explicit types** for function parameters and returns
3. **Type definitions** in `src/lib/game-types.ts`
4. **Avoid `any`** - Use `unknown` if type is truly unknown

**Example:**

```typescript
// Good
function updatePlayer(playerId: string, updates: Partial<Player>): Player {
  // ...
}

// Bad
function updatePlayer(playerId, updates) {
  // ...
}
```

### React Components

1. **Functional components only** - No class components
2. **Props interface** for all components
3. **Export default** for page components
4. **Named exports** for utility components

**Example:**

```typescript
// src/components/example.tsx
interface ExampleProps {
  title: string;
  onAction: () => void;
}

export function Example({ title, onAction }: ExampleProps) {
  return <div>{title}</div>;
}
```

### File Naming

- **Pages:** `page.tsx`, `layout.tsx` (Next.js convention)
- **Components:** `kebab-case.tsx` (e.g., `game-layout.tsx`)
- **Utilities:** `kebab-case.ts` (e.g., `rate-limiter.ts`)
- **Types:** `game-types.ts`, `api-types.ts`
- **Constants:** `constants.ts`, `api-constants.ts`

### Import Organization

```typescript
// 1. External imports
import { useState } from 'react';
import { NextRequest, NextResponse } from 'next/server';

// 2. Internal imports (use @ alias)
import { GameState, Player } from '@/lib/game-types';
import { storage } from '@/lib/storage-adapter';
import { logger } from '@/lib/utils/logger';

// 3. Relative imports (avoid when possible)
import { SpecificComponent } from './components/specific';
```

### Error Messages

1. **User-facing:** Friendly, actionable

   ```typescript
   'Failed to join game. Please check your room code and try again.';
   ```

2. **Logs:** Technical, with context
   ```typescript
   logger.error('Failed to join game', error, { roomCode, playerId });
   ```

### API Routes

**Pattern:**

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    const validated = schema.parse(body);

    // 2. Rate limiting
    const rateLimitResult = await checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // 3. Business logic
    const result = await performOperation(validated);

    // 4. Return response
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Operation failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Security Conventions

1. **Always sanitize user input** before storing or displaying

   ```typescript
   import { sanitizeHtml } from '@/lib/utils/security';
   const clean = sanitizeHtml(userInput);
   ```

2. **Use Zod schemas** for all API input validation

3. **Never trust client data** - Re-validate on server

4. **Use parameterized queries** - Never string concatenation

   ```typescript
   // Good
   await client.query('SELECT * FROM games WHERE room_code = $1', [roomCode]);

   // Bad
   await client.query(`SELECT * FROM games WHERE room_code = '${roomCode}'`);
   ```

---

## Testing Strategy

### Unit Tests

**Location:** `src/__tests__/`

**Pattern:**

```typescript
import { describe, it, expect } from 'vitest';

describe('generateRoomCode', () => {
  it('should generate 6-character room code', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});
```

**What to test:**

- Utility functions
- Validation logic
- Business logic in `/lib`
- Edge cases and error conditions

**What NOT to test:**

- Next.js framework internals
- Third-party libraries
- UI component snapshots (too brittle)

### E2E Tests

**Location:** `e2e/`

**Pattern:**

```typescript
import { test, expect } from '@playwright/test';

test('should create and join game', async ({ page }) => {
  await page.goto('http://localhost:9002');

  // Create game
  await page.fill('[name="playerName"]', 'Alice');
  await page.click('text=Create Game');

  // Verify room code displayed
  await expect(page.locator('[data-testid="room-code"]')).toBeVisible();
});
```

**What to test:**

- Critical user flows
- Multi-step interactions
- Authentication flows
- Error handling

### Test Commands

```bash
npm run test              # Run all unit tests
npm run test:ui          # Vitest UI
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run Playwright E2E tests
```

---

## Deployment

### Vercel (Recommended)

**Configuration:** `vercel.json`

**Environment Variables Required:**

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `XAI_API_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`

**Automatic Features:**

- Build on push
- Preview deployments for PRs
- Serverless function optimization
- Cron jobs (cleanup task runs daily at midnight)

**Deployment:**

```bash
# Via Vercel CLI
vercel

# Production deployment
vercel --prod
```

### Docker + Digital Ocean (Alternative)

**Files:**

- `Dockerfile` (if exists)
- `.dockerignore`
- `docker-compose.yml` (if exists)

**See:** `DEPLOY.md` and `DOCKER.md` for detailed instructions

### Environment-Specific Behavior

**Development (`NODE_ENV=development`):**

- In-memory storage fallback if no `DATABASE_URL`
- Less strict CSP headers
- Verbose logging
- Hot reload enabled

**Production (`NODE_ENV=production`):**

- Requires `DATABASE_URL`
- Strict security headers
- HSTS enabled
- Structured logging (JSON format)

---

## Security Considerations

### Authentication & Authorization

**Middleware:** `src/middleware.ts`

**Public Routes:**

- `/` (home page)
- `/sign-in*`
- `/sign-up*`
- `/api/webhooks*`

**All other routes require authentication.**

**Pattern:**

```typescript
if (!isPublicRoute(request)) {
  await auth.protect(); // Throws if not authenticated
}
```

### Input Validation

**Layers:**

1. **Client-side:** Basic validation (UX only, not security)
2. **API routes:** Zod schema validation (primary defense)
3. **Database:** Type checking and constraints

**Always validate:**

- Room codes (length, characters)
- Player names (length, HTML stripped)
- Answers (HTML sanitized)
- Categories (whitelist check)
- Spicy levels (enum validation)

### XSS Prevention

**Function:** `sanitizeHtml()` in `src/lib/utils/security.ts`

**Usage:**

```typescript
import { sanitizeHtml } from '@/lib/utils/security';

const cleanAnswer = sanitizeHtml(userAnswer); // Strips all HTML tags
```

**Applied to:**

- Player names
- Game answers
- Any user-generated content displayed in UI

### Rate Limiting

**Implementation:** `src/lib/utils/rate-limiter.ts`

**Limits:**

- 10 requests/min for game creation
- 20 requests/min for joining games
- 60 requests/min for game updates

**Enforcement:** All game API routes

### Security Headers

**Configured in:** `src/middleware.ts`

**Headers:**

- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `Referrer-Policy: no-referrer` - Privacy protection
- `Content-Security-Policy` - XSS protection
- `Strict-Transport-Security` (production only) - Force HTTPS
- `Permissions-Policy` - Disable unnecessary browser features

### Database Security

**Connection:**

- Connection pooling (max 1 for serverless)
- Query timeout enforcement (10s)
- Parameterized queries only

**Data:**

- Games expire after 24 hours (automatic cleanup)
- No sensitive data stored in plain text
- Player emails hashed (if applicable)

### API Security

1. **CORS:** Configured in Next.js config for allowed image domains
2. **Payload size:** Limited to 1MB
3. **Request validation:** All inputs validated with Zod
4. **Error messages:** Generic (don't leak implementation details)

---

## Common Tasks

### Adding a New Game Category

1. **Update constants:**

   ```typescript
   // src/lib/constants.ts
   export const CATEGORIES: Category[] = [
     // ... existing categories ...
     {
       name: 'New Category',
       icon: SomeIcon, // from lucide-react
       description: 'Description here.',
     },
   ];
   ```

2. **Update AI prompts:**
   - Edit `src/ai/flows/generate-contextual-questions.ts`
   - Add category-specific prompt guidance

3. **Test:**
   - Create game with new category
   - Verify questions match category theme

### Adding a New API Route

1. **Create route file:**

   ```typescript
   // src/app/api/new-route/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { z } from 'zod';

   const schema = z.object({
     // Define schema
   });

   export async function POST(request: NextRequest) {
     // Implementation
   }
   ```

2. **Add rate limiting** (if needed)

3. **Add tests**

4. **Update API documentation**

### Adding a New Game Step

1. **Create step component:**

   ```typescript
   // src/app/game/[roomCode]/steps/new-step.tsx
   'use client';

   import { StepProps } from '@/lib/game-types';

   export function NewStep({ gameState, me, handlers }: StepProps) {
     // Implementation
   }
   ```

2. **Update game types:**

   ```typescript
   // src/lib/game-types.ts
   export type GameStep = 'lobby' | 'categories' | 'spicy' | 'new-step' | 'game' | 'summary';
   ```

3. **Update game page:**
   ```typescript
   // src/app/game/[roomCode]/page.tsx
   {gameState.step === 'new-step' && <NewStep {...stepProps} />}
   ```

### Modifying AI Prompts

**CRITICAL: AI prompts are core to the user experience**

1. **Read persona documentation:**
   - `agents.md` - Agent personas and guidelines
   - `aiprompting.md` - Detailed prompt patterns

2. **Locate flow:**
   - `src/ai/flows/generate-contextual-questions.ts` - Question generation
   - `src/ai/flows/analyze-answers-and-generate-summary.ts` - Summaries

3. **Test extensively:**

   ```bash
   npm run genkit:dev
   # Test in Genkit UI with various inputs
   ```

4. **Validate:**
   - Check prompt injection prevention still works
   - Verify tone matches brand voice
   - Test edge cases (1 player, 10 players, etc.)

### Adding a New Achievement

1. **Update achievements:**

   ```typescript
   // src/lib/achievements.ts
   export const ACHIEVEMENTS: Achievement[] = [
     // ... existing achievements ...
     {
       id: 'new-achievement',
       name: 'Achievement Name',
       description: 'Witty description in brand voice',
       icon: SomeIcon,
       condition: (gameState, playerAnswers) => {
         // Return true if achievement earned
       },
     },
   ];
   ```

2. **Test:** Complete game and verify achievement triggers

### Debugging Database Issues

```typescript
// Enable query logging
// src/lib/storage-pg.ts
console.log('Executing query:', query, params);

// Check pool status
const pool = getPool();
console.log('Pool total:', pool.totalCount);
console.log('Pool idle:', pool.idleCount);
console.log('Pool waiting:', pool.waitingCount);
```

**Common issues:**

- Connection pool exhaustion (increase `max` or decrease timeout)
- Query timeout (increase timeout or optimize query)
- Race conditions (add row-level locking)

### Debugging AI Flow Issues

1. **Use Genkit Developer UI:**

   ```bash
   npm run genkit:dev
   ```

2. **Check logs:**
   - Server action logs in Next.js console
   - Genkit flow traces in Genkit UI

3. **Common issues:**
   - API key not set (`XAI_API_KEY`)
   - Rate limit exceeded (wait or use different key)
   - Prompt injection detected (check input sanitization)
   - Timeout (increase timeout in server action)

---

## Important Files Reference

### Core Type Definitions

| File                       | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `src/lib/game-types.ts`    | All TypeScript types and interfaces      |
| `src/lib/constants.ts`     | Categories, spicy levels, game constants |
| `src/lib/api-constants.ts` | API rate limits and timeouts             |

### Database & Storage

| File                         | Purpose                   |
| ---------------------------- | ------------------------- |
| `src/lib/storage-adapter.ts` | Storage abstraction layer |
| `src/lib/storage-pg.ts`      | PostgreSQL implementation |
| `src/lib/storage-memory.ts`  | In-memory fallback        |
| `src/lib/utils/db-health.ts` | Database health checks    |

### AI & Genkit

| File                                                   | Purpose                          |
| ------------------------------------------------------ | -------------------------------- |
| `src/ai/genkit.ts`                                     | Genkit configuration             |
| `src/ai/flows/generate-contextual-questions.ts`        | Question generation              |
| `src/ai/flows/analyze-answers-and-generate-summary.ts` | Summary generation               |
| `src/ai/flows/shared-utils.ts`                         | Prompt injection prevention      |
| `src/app/game/actions.ts`                              | Server actions for AI operations |

### Security & Validation

| File                            | Purpose                           |
| ------------------------------- | --------------------------------- |
| `src/middleware.ts`             | Authentication + security headers |
| `src/lib/utils/security.ts`     | XSS prevention, HTML sanitization |
| `src/lib/utils/rate-limiter.ts` | Request rate limiting             |
| `src/lib/player-validation.ts`  | Input validation utilities        |
| `src/lib/env.ts`                | Environment variable validation   |

### Game Logic

| File                               | Purpose                           |
| ---------------------------------- | --------------------------------- |
| `src/lib/game-utils.ts`            | Room code generation, chaos mode  |
| `src/lib/achievements.ts`          | Achievement definitions and logic |
| `src/lib/client-game.ts`           | Client-side game API wrapper      |
| `src/app/game/[roomCode]/page.tsx` | Main game page                    |

### API Routes

| Route                      | File                                   |
| -------------------------- | -------------------------------------- |
| POST `/api/game/create`    | `src/app/api/game/create/route.ts`     |
| POST `/api/game/join`      | `src/app/api/game/join/route.ts`       |
| POST `/api/game/update`    | `src/app/api/game/update/route.ts`     |
| GET `/api/game/[roomCode]` | `src/app/api/game/[roomCode]/route.ts` |
| GET `/api/health`          | `src/app/api/health/route.ts`          |
| GET `/api/health/db`       | `src/app/api/health/db/route.ts`       |
| DELETE `/api/cron/cleanup` | `src/app/api/cron/cleanup/route.ts`    |

### Configuration

| File                 | Purpose                             |
| -------------------- | ----------------------------------- |
| `package.json`       | Dependencies, scripts, Node version |
| `tsconfig.json`      | TypeScript compiler settings        |
| `next.config.mjs`    | Next.js configuration               |
| `vercel.json`        | Vercel deployment settings          |
| `tailwind.config.ts` | Tailwind CSS configuration          |
| `.eslintrc.cjs`      | ESLint rules                        |
| `.prettierrc`        | Code formatting rules               |

### Documentation

| File             | Purpose                        |
| ---------------- | ------------------------------ |
| `README.md`      | Project overview and setup     |
| `CLAUDE.md`      | This file - AI assistant guide |
| `agents.md`      | AI agent personas              |
| `aiprompting.md` | Detailed AI prompt patterns    |
| `DEPLOY.md`      | Deployment instructions        |
| `DOCKER.md`      | Docker setup guide             |
| `CHANGELOG.md`   | Version history                |

---

## Things to Avoid

### Code Anti-Patterns

❌ **Don't use `any` type**

```typescript
// Bad
function process(data: any) { ... }

// Good
function process(data: unknown) {
  if (isValidData(data)) {
    // Type-safe processing
  }
}
```

❌ **Don't modify AI flows without understanding personas**

- Read `agents.md` and `aiprompting.md` first
- AI tone and specificity are core to UX
- Test extensively with Genkit UI

❌ **Don't skip input validation**

```typescript
// Bad
const roomCode = request.body.roomCode;
await storage.getGame(roomCode);

// Good
const schema = z.object({ roomCode: z.string().length(6) });
const { roomCode } = schema.parse(request.body);
await storage.getGame(roomCode);
```

❌ **Don't use `Math.random()` for cleanup**

- Use deterministic time-based cleanup
- See `src/lib/utils/rate-limiter.ts` for correct pattern

❌ **Don't create new state management libraries**

- Use built-in React state for client
- Use database for server state
- No Redux, Zustand, or similar needed

❌ **Don't hardcode environment variables**

```typescript
// Bad
const apiKey = process.env.XAI_API_KEY;

// Good
import { env } from '@/lib/env';
const apiKey = env.XAI_API_KEY;
```

### Security Anti-Patterns

❌ **Don't trust client data**

- Always re-validate on server
- Never use client-provided IDs for authorization

❌ **Don't skip HTML sanitization**

- All user input must be sanitized before display
- Use `sanitizeHtml()` from security utils

❌ **Don't use string concatenation for SQL**

```typescript
// Bad - SQL injection risk
await client.query(`SELECT * FROM games WHERE id = '${id}'`);

// Good - parameterized query
await client.query('SELECT * FROM games WHERE id = $1', [id]);
```

❌ **Don't disable security features**

- Don't skip rate limiting "to make testing easier"
- Don't remove security headers
- Don't disable authentication in production

### Testing Anti-Patterns

❌ **Don't test implementation details**

```typescript
// Bad
expect(component.state.isLoading).toBe(false);

// Good
expect(screen.getByText('Submit')).toBeEnabled();
```

❌ **Don't skip tests for "simple" functions**

- Simple functions often have edge cases
- Tests document expected behavior

❌ **Don't mock what you don't own**

- Mock your own abstractions, not third-party libraries
- Use integration tests for third-party interactions

### Database Anti-Patterns

❌ **Don't create connections without pooling**

```typescript
// Bad
const client = new pg.Client();
await client.connect();

// Good
const pool = getPool(); // Reuses connections
const client = await pool.connect();
```

❌ **Don't forget to release connections**

```typescript
try {
  const client = await pool.connect();
  // ... operations ...
} finally {
  client.release(); // Always release!
}
```

❌ **Don't ignore transaction errors**

```typescript
try {
  await client.query('BEGIN');
  // ... operations ...
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK'); // Always rollback on error
  throw error;
}
```

### Deployment Anti-Patterns

❌ **Don't commit secrets**

- Never commit `.env` files
- Use environment variables in Vercel dashboard

❌ **Don't skip build checks**

- TypeScript must compile without errors
- ESLint must pass
- Tests must pass

❌ **Don't deploy without testing**

- Always test locally with `npm run build && npm start`
- Test in preview deployment before production

---

## Additional Resources

### Internal Documentation

- `README.md` - Project setup and overview
- `agents.md` - AI agent personas and guidelines
- `aiprompting.md` - Detailed AI prompt engineering
- `DEPLOY.md` - Deployment instructions
- `CHANGELOG.md` - Version history and changes

### External Documentation

- [Next.js 15 Docs](https://nextjs.org/docs)
- [React 18 Docs](https://react.dev)
- [Clerk Documentation](https://clerk.com/docs)
- [Genkit Documentation](https://firebase.google.com/docs/genkit)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

### Development Tools

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Clerk Dashboard](https://dashboard.clerk.com/)
- [xAI Console](https://console.x.ai/)

---

## Version History

| Version | Date       | Changes                             |
| ------- | ---------- | ----------------------------------- |
| 1.0.0   | 2025-11-13 | Initial comprehensive guide created |

---

## Contact & Support

For questions or issues:

1. Check existing documentation in `/docs`
2. Review `README.md` for common issues
3. Check `CHANGELOG.md` for recent changes
4. Review code comments in relevant files

---

**Remember:** This is a couples' intimacy app. Always prioritize:

1. **User privacy** - No data leaks, secure storage
2. **Safety** - Content moderation, respectful AI responses
3. **Quality** - AI responses must match brand voice (playful, witty, intimate)
4. **Reliability** - No data loss, robust error handling
5. **Performance** - Fast load times, responsive UI

When in doubt, read the code and tests. They are the source of truth.
