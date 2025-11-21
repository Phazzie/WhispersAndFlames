# Quick Start: Using Mock Services

## Setup (Already Done ✅)

All mock services are implemented and ready to use!

## Basic Usage

### 1. Import Services
```typescript
import { gameService, aiService, authService } from '@/lib/services/factory';
```

### 2. Create & Join a Game
```typescript
// Create game
const game = await gameService.createGame({
  hostId: 'user-123',
  playerName: 'Alice',
  email: 'alice@example.com',
  gameMode: 'online'
});
console.log('Room Code:', game.roomCode);

// Join game
await gameService.joinGame({
  roomCode: game.roomCode,
  playerId: 'user-456',
  playerName: 'Bob',
  email: 'bob@example.com'
});
```

### 3. Subscribe to Updates
```typescript
const unsubscribe = gameService.subscribe(game.roomCode, (updatedGame) => {
  console.log('Players:', updatedGame.players.length);
  console.log('Step:', updatedGame.step);
});

// Later: clean up
unsubscribe();
```

### 4. Generate AI Content
```typescript
// Question
const { question } = await aiService.generateQuestion({
  categories: ['Power Play'],
  spicyLevel: 'Medium',
  previousQuestions: [],
  playerCount: 2
});

// Summary
const { summary } = await aiService.generateSummary({
  questions: ['Q1', 'Q2', 'Q3'],
  answers: ['A1', 'A2', 'A3', 'A4'],
  categories: ['Hidden Attractions'],
  spicyLevel: 'Hot',
  playerCount: 2
});
```

### 5. Authentication (Demo Users)
```typescript
// Sign in with demo user
const user = await authService.signIn({
  email: 'alice@example.com',
  password: 'password123'
});

// Get current user
const current = await authService.getCurrentUser();
```

## Demo Users
- alice@example.com / password123
- bob@example.com / password123
- charlie@example.com / password123

## Environment Control

```bash
# .env.local
USE_MOCKS=true   # Use mocks (default in dev)
```

## File Structure
```
src/
├── contracts/          # Type definitions
│   ├── Game.ts        # ✅ Game service contract
│   ├── AI.ts          # ✅ AI service contract
│   └── Auth.ts        # ✅ Auth service contract
│
└── lib/services/
    ├── factory.ts     # ✅ Service selector
    └── mock/
        ├── GameMock.ts   # ✅ Complete
        ├── AIMock.ts     # ✅ Complete
        └── AuthMock.ts   # ✅ Complete
```

## What's Implemented

### GameMockService ✅
- ✅ Create game with validation
- ✅ Join game (3-player limit)
- ✅ Real-time subscriptions
- ✅ Update game/player state
- ✅ Delete game
- ✅ Animal-based room codes
- ✅ 100-200ms delays

### AIMockService ✅
- ✅ Question banks (Mild → Extra-Hot)
- ✅ Couples vs Triads questions
- ✅ Question deduplication
- ✅ Summary generation
- ✅ Therapist notes
- ✅ Visual memory prompts
- ✅ 300-700ms delays

### AuthMockService ✅
- ✅ Sign in/up/out
- ✅ Session management
- ✅ Demo user seeding
- ✅ Email validation
- ✅ Password requirements
- ✅ 100-250ms delays

## Next Steps

1. **Build UI** against these mocks
2. **Write contract tests**
3. **Implement real services** in Phase 3
4. **Switch to real** via `USE_MOCKS=false`

---

**Status**: Ready for UI Development 🚀
