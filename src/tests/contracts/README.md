# Contract Tests for Whispers and Flames

## Overview

This directory contains **contract tests** that define the expected behavior of services in the Whispers and Flames application. Contract tests are the bridge between mock and real implementations, ensuring they behave identically from the consumer's perspective.

## What are Contract Tests?

Contract tests are implementation-agnostic tests that:

1. **Define the interface** - Specify what methods a service must have
2. **Define the behavior** - Specify how those methods should behave
3. **Run against multiple implementations** - The same tests validate both mock and real services
4. **Guarantee compatibility** - When both pass, they're functionally identical

## The Three Contract Suites

### 1. GameService Contract (`GameService.contract.test.ts`)

Tests the storage layer for:
- **Game operations** - create, get, update, delete, list, subscribe
- **User operations** - create, findByEmail, findById
- **Session operations** - create, validate, delete

**Implementations:**
- Mock: `src/lib/storage-memory.ts` (in-memory Map-based storage)
- Real: `src/lib/storage-pg.ts` (PostgreSQL with connection pooling)

### 2. AIService Contract (`AIService.contract.test.ts`)

Tests the AI layer for:
- **Question generation** - Context-aware, spicy-level appropriate questions
- **Summary generation** - Analyzing session answers and identifying themes
- **Therapist notes** - Clinical observations with personality (Dr. Ember)
- **Visual memory** - Abstract image prompts based on session

**Implementations:**
- Mock: `src/lib/services/mock/AIMock.ts` (pre-defined question banks)
- Real: `src/ai/flows/*` (XAI/Gemini integration via Genkit)

### 3. AuthService Contract (`AuthService.contract.test.ts`)

Tests the authentication layer for:
- **Sign up** - User registration with validation
- **Sign in** - Authentication with email/password
- **Session management** - Token creation and validation
- **User management** - Profile updates, account deletion

**Implementations:**
- Mock: `src/lib/services/mock/AuthMock.ts` (in-memory user store)
- Real: Clerk integration via `@clerk/nextjs`

## How to Use Contract Tests

### Step 1: Import the Contract Test Suite

```typescript
import { runGameServiceContractTests } from '@/tests/contracts/GameService.contract.test';
import { storage } from '@/lib/storage-memory'; // or storage-pg

describe('In-Memory Storage Implementation', () => {
  runGameServiceContractTests(storage);
});
```

### Step 2: Run Tests

```bash
# Run all contract tests
npm run test:contracts

# Run specific contract
npm run test -- GameService.contract

# Run in watch mode
npm run test -- --watch
```

### Step 3: Verify Both Implementations

```typescript
// Test mock implementation
describe('Mock Storage', () => {
  runGameServiceContractTests(memoryStorage);
});

// Test real implementation
describe('PostgreSQL Storage', () => {
  runGameServiceContractTests(pgStorage);
});
```

**When both pass, they're guaranteed to be compatible!**

## Contract Test Structure

Each contract test suite follows this pattern:

```typescript
export interface ServiceInterface {
  method1(param: Type): ReturnType;
  method2(param: Type): ReturnType;
}

export function runContractTests(service: ServiceInterface) {
  describe('Contract Suite', () => {
    describe('method1', () => {
      it('should handle valid input', async () => {
        const result = await service.method1(validInput);
        expect(result).toBeDefined();
        expect(result.field).toBe(expectedValue);
      });

      it('should handle edge case', async () => {
        const result = await service.method1(edgeInput);
        expect(result).toBe(expectedEdgeResult);
      });

      it('should throw on invalid input', async () => {
        await expect(service.method1(invalidInput)).rejects.toThrow();
      });
    });
  });
}
```

## Writing Good Contract Tests

### ✅ DO:

1. **Test the contract, not the implementation**
   ```typescript
   // Good: Tests behavior
   expect(result.roomCode).toHaveLength(6);

   // Bad: Tests implementation detail
   expect(generateRoomCode).toHaveBeenCalledWith(crypto);
   ```

2. **Test all method signatures**
   ```typescript
   it('should accept valid parameters', async () => {
     const result = await service.create('param1', 'param2');
     expect(result).toBeDefined();
   });
   ```

3. **Test return types**
   ```typescript
   it('should return correct shape', async () => {
     const result = await service.getGame('ABC123');
     expect(result).toHaveProperty('roomCode');
     expect(result).toHaveProperty('players');
     expect(typeof result.roomCode).toBe('string');
   });
   ```

4. **Test error conditions**
   ```typescript
   it('should throw for invalid input', async () => {
     await expect(service.create('')).rejects.toThrow('Required');
   });
   ```

5. **Test edge cases**
   ```typescript
   it('should handle empty arrays', async () => {
     const result = await service.list('user-id');
     expect(Array.isArray(result)).toBe(true);
     expect(result.length).toBe(0);
   });
   ```

### ❌ DON'T:

1. **Don't test implementation details**
   ```typescript
   // Bad: Relies on internal state
   expect(service['internalCache'].size).toBe(1);
   ```

2. **Don't mock the service under test**
   ```typescript
   // Bad: Defeats the purpose of contract tests
   vi.mock('@/lib/storage-adapter');
   ```

3. **Don't test unrelated functionality**
   ```typescript
   // Bad: Tests utility function, not service contract
   expect(generateRoomCode()).toMatch(/^[A-Z0-9]{6}$/);
   ```

4. **Don't use specific implementation values**
   ```typescript
   // Bad: Assumes database-specific error
   expect(error.message).toContain('UNIQUE constraint');

   // Good: Tests contract behavior
   await expect(service.create(existingCode)).rejects.toThrow();
   ```

## Benefits of Contract Tests

### 1. **Parallel Development**
Frontend and backend teams can work simultaneously:
- Backend writes contract tests (defines expected behavior)
- Frontend uses mock implementation (passes contract tests)
- Backend implements real service (also passes contract tests)
- Integration "just works" when both pass

### 2. **Zero Integration Bugs**
If mock and real both pass contracts:
```
Mock passes contract tests  ✓
Real passes contract tests  ✓
Therefore: Mock ≡ Real      ✓
```

### 3. **Rapid Iteration**
Swap implementations without breaking consumers:
```typescript
// Switch from mock to real
const service = USE_MOCKS ? new GameMock() : new GameReal();

// UI doesn't need to change - contract guarantees compatibility
const game = await service.createGame(hostId, playerName);
```

### 4. **Type Safety**
TypeScript enforces the contract at compile time:
```typescript
// Won't compile if method signature doesn't match
class GameReal implements IGameService {
  async createGame(hostId: string, playerName: string): Promise<GameSeam> {
    // Implementation
  }
}
```

## Example: Adding a New Service Method

1. **Update the interface**
   ```typescript
   export interface GameStorageService {
     games: {
       // ... existing methods
       archive(roomCode: string): Promise<void>; // New method
     }
   }
   ```

2. **Write contract tests**
   ```typescript
   describe('games.archive', () => {
     it('should archive an existing game', async () => {
       const roomCode = 'ARCHIVE1';
       await service.games.create(roomCode, initialState);

       await service.games.archive(roomCode);

       const result = await service.games.get(roomCode);
       expect(result).toBeUndefined(); // Archived games don't appear in get
     });

     it('should throw for non-existent game', async () => {
       await expect(service.games.archive('NOTFOUND')).rejects.toThrow();
     });
   });
   ```

3. **Implement in mock**
   ```typescript
   export class GameMockService implements GameStorageService {
     async archive(roomCode: string): Promise<void> {
       const game = this.games.get(roomCode);
       if (!game) throw new Error('Game not found');
       this.archivedGames.set(roomCode, game);
       this.games.delete(roomCode);
     }
   }
   ```

4. **Implement in real service**
   ```typescript
   export const storage = {
     games: {
       archive: async (roomCode: string): Promise<void> => {
         await pool.query(
           'UPDATE games SET archived = true WHERE room_code = $1',
           [roomCode]
         );
       }
     }
   }
   ```

5. **Run tests - both should pass!**
   ```bash
   npm run test:contracts
   ✓ Mock implementation passes
   ✓ Real implementation passes
   ✓ Integration guaranteed to work
   ```

## Troubleshooting

### Contract test fails for one implementation but not the other

This means the implementations are **not** functionally identical:

1. Check the failing test output
2. Compare implementations side-by-side
3. Look for differences in:
   - Return values
   - Error handling
   - Edge cases
   - Data transformations

### Contract test passes but integration fails

This suggests:
1. The contract tests are incomplete
2. There's a missing edge case
3. The production environment differs from test

**Solution:** Add more contract tests to cover the failing scenario.

### How to handle async vs sync implementations?

Contract tests support both:
```typescript
export interface StorageService {
  get(id: string): Promise<Data | undefined> | Data | undefined;
}

// In tests
const result = await service.get('id'); // Works for both
```

## Best Practices

1. **Run contract tests in CI/CD**
   ```yaml
   # .github/workflows/test.yml
   - name: Run Contract Tests
     run: npm run test:contracts
   ```

2. **Keep contracts stable**
   - Don't change contracts frequently
   - Use versioning for breaking changes
   - Deprecate old methods before removing

3. **Document contract expectations**
   ```typescript
   /**
    * Creates a new game with the given room code
    * @throws {Error} if room code already exists
    * @returns {GameState} the created game
    */
   create(roomCode: string, state: GameState): Promise<GameState>
   ```

4. **Test error messages consistently**
   ```typescript
   // Define expected error messages in contract
   it('should throw specific error for duplicate', async () => {
     await expect(service.create(existingCode))
       .rejects.toThrow('already exists');
   });
   ```

## Summary

Contract tests are the **bridge** between mock and real implementations. They ensure that:

- ✅ Mocks accurately represent real behavior
- ✅ Real services match expected contracts
- ✅ Frontend and backend can develop in parallel
- ✅ Integration "just works" when both pass
- ✅ Refactoring doesn't break consumers
- ✅ Type safety is enforced at compile time

**The Golden Rule:** If both implementations pass all contract tests, they are guaranteed to be functionally identical from the consumer's perspective.
