# Service Layer - Seam-Driven Development

This directory implements the **Seam-Driven Development (SDD)** pattern for Whispers and Flames. Services are defined by contracts (interfaces) and have both mock and real implementations that pass identical test suites.

## Directory Structure

```
services/
├── mock/               # Mock implementations (in-memory, for development)
│   ├── GameMock.ts
│   ├── AIMock.ts
│   └── AuthMock.ts
├── real/               # Real implementations (API/DB, for production)
│   ├── GameReal.ts     # TODO: Phase 3
│   ├── AIReal.ts       # TODO: Phase 3
│   └── AuthReal.ts     # TODO: Phase 3
└── factory.ts          # Service selection based on environment
```

## Contracts

Service contracts are defined in `/src/contracts/`:

- **Game.ts** - Game state management (rooms, players, game flow)
- **AI.ts** - AI-powered features (questions, summaries, therapist notes)
- **Auth.ts** - User authentication and session management

## Using Services

### Import from Factory

Always import services from the factory, never directly:

```typescript
import { gameService, aiService, authService } from '@/lib/services/factory';

// Services automatically switch between mock/real based on environment
const game = await gameService.createGame('user-123', 'Alice', 'alice@example.com');
```

### Environment Configuration

Set `USE_MOCKS` environment variable to control which implementation is used:

```bash
# .env.local
USE_MOCKS=true   # Use mock services (fast, in-memory)
USE_MOCKS=false  # Use real services (API, database)
```

**Defaults:**
- Development: `USE_MOCKS=true`
- Production: `USE_MOCKS=false`

## Mock Service Features

### GameMockService

**Features:**
- In-memory game storage with Map
- Unique room code generation (animal-based pattern)
- 3-player limit enforcement
- Real-time subscription support
- 24-hour expiration tracking
- Realistic network delays (100-200ms)

**Example Usage:**
```typescript
// Create game
const game = await gameService.createGame('user-1', 'Alice', 'alice@example.com');

// Join game
await gameService.joinGame(game.roomCode, 'user-2', 'Bob', 'bob@example.com');

// Subscribe to updates
const unsubscribe = gameService.subscribe(game.roomCode, (updatedGame) => {
  console.log('Game updated:', updatedGame);
});

// Update game state
await gameService.updateGame(game.roomCode, { step: 'categories' });
```

### AIMockService

**Features:**
- Question banks organized by spicy level
- Separate banks for couples (2 players) and trios (3 players)
- Question deduplication (avoids repeating previous questions)
- Realistic AI processing delays (300-700ms)
- Abstract visual memory prompts (never explicit)

**Example Usage:**
```typescript
// Generate question
const { question } = await aiService.generateQuestion({
  categories: ['Power Play'],
  spicyLevel: 'Medium',
  previousQuestions: [],
  playerCount: 2,
});

// Generate summary
const { summary } = await aiService.generateSummary({
  questions: ['Q1', 'Q2', 'Q3'],
  answers: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
  categories: ['Hidden Attractions'],
  spicyLevel: 'Hot',
  playerCount: 2,
});
```

### AuthMockService

**Features:**
- In-memory user storage
- Seeded demo users for development
- Session management
- Input validation matching real service
- Realistic network delays (100-250ms)

**Demo Users:**
- alice@example.com / password123
- bob@example.com / password123
- charlie@example.com / password123

**Example Usage:**
```typescript
// Sign in
const user = await authService.signIn('alice@example.com', 'password123');

// Get current user
const currentUser = await authService.getCurrentUser();

// Sign up
const newUser = await authService.signUp(
  'dave@example.com',
  'password123',
  'Dave'
);

// Sign out
await authService.signOut();
```

## Mock Implementation Principles

All mocks follow these principles to feel REAL to the UI:

### 1. Realistic Delays
```typescript
await delay(200); // Simulates network latency
```

### 2. Proper Validation
```typescript
if (!playerName?.trim()) {
  throw new Error('Player name is required');
}
```

### 3. Identical Error Messages
Mocks throw the same errors as real services will:
- "Game not found"
- "Game is full"
- "Player already in game"
- "Email is required"

### 4. Deep Cloning
Return copies to prevent external mutations:
```typescript
return structuredClone(game);
```

### 5. Async Subscription Notifications
```typescript
setTimeout(() => cb(structuredClone(game)), 0);
```

## Contract Tests

Contract tests validate that both mock and real implementations behave identically. They are located in `/src/tests/contracts/`.

### Running Contract Tests

```bash
# Test mock implementations
npm run test -- GameMock.test.ts
npm run test -- AIMock.test.ts
npm run test -- AuthMock.test.ts

# Test real implementations (Phase 3)
npm run test -- GameReal.test.ts
npm run test -- AIReal.test.ts
npm run test -- AuthReal.test.ts
```

### Example Contract Test

```typescript
import { GameMockService } from '@/lib/services/mock/GameMock';
import { createGameServiceContractTests } from '@/tests/contracts/GameService.contract.test';

describe('GameMockService', () => {
  const { runContractTests } = createGameServiceContractTests();

  // Run the SAME tests against mock
  runContractTests(new GameMockService());
});
```

## Development Workflow

### Phase 1: Contracts & Mocks (Current)
- ✅ Define contracts (`/contracts`)
- ✅ Implement mocks (`/services/mock`)
- ✅ Write contract tests
- ✅ Verify mocks pass tests

### Phase 2: UI Development
- Build UI components against mock services
- No backend required yet
- Fast development cycle
- Predictable test data

### Phase 3: Real Services
- Implement real services (`/services/real`)
- Run same contract tests
- Verify identical behavior
- Switch factory to real services

### Phase 4: Integration
- Switch environment variable
- UI works identically
- Zero integration issues (guaranteed by contract tests)

## Benefits

1. **Parallel Development**: Frontend and backend teams work simultaneously
2. **Fast Iteration**: Mocks have zero network latency
3. **Type Safety**: TypeScript enforces contracts at compile time
4. **Guaranteed Integration**: When both pass contract tests, they're functionally identical
5. **Easy Testing**: Predictable mock data for UI tests
6. **Zero Vendor Lock-in**: Swap implementations without changing consumers

## Troubleshooting

### TypeScript Errors

If you see "Cannot find module '@/contracts/Game'":
```bash
# Check tsconfig.json includes path aliases
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Mock Not Loading

If changes to mocks don't appear:
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Services Not Switching

If environment variable doesn't work:
```bash
# Restart dev server after changing .env.local
npm run dev
```

## Next Steps

- [ ] Write contract test suites (`/tests/contracts`)
- [ ] Implement real GameService with PostgreSQL
- [ ] Implement real AIService with xAI/Gemini
- [ ] Implement real AuthService with Clerk
- [ ] Verify real services pass contract tests
- [ ] Deploy to production

## Questions?

See:
- `/SVELTEKIT_SDD_DESIGN.md` - Complete SDD methodology
- `/CLAUDE.md` - Project architecture guide
- Contract interfaces in `/src/contracts/`
