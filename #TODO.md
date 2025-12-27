# Action Plan

## 1. System Improvements

### Unified Game Context
The current system separates "online" (Clerk + API) and "local" (localStorage) games, which will cause code duplication and maintenance issues.
- **Goal:** Create a `GameProvider` that abstracts the data source.
- **Details:** The provider will expose `gameState`, `actions` (like `submitAnswer`, `nextStep`), and `isLoading`. The underlying implementation will switch based on the `gameMode` (detected via URL or context).

### Robust Error Handling
- **Goal:** Improve user feedback for errors.
- **Details:** Centralized error logging service (even if it's just `console.error` for now, but structured). A `ToastProvider` wrapper to standardize error messages.

### Automated Verification
- **Goal:** Ensure quality before commits.
- **Details:** Enhance `husky` hooks to run a "quick check" (lint + typecheck) and a "full check" (tests) before push.

## 2. Outstanding Tasks

### Local Mode UI Integration
- **Status:** Logic exists in `src/lib/local-game.ts`, but UI `src/app/game/[roomCode]/page.tsx` is tightly coupled to `clientGame` and Clerk.
- **Task:** Refactor `page.tsx` to use the proposed `GameProvider` or conditionally load `LocalGameManager` vs `OnlineGameManager`.

### Code Quality
- **Status:** `z.any()` found in `src/app/api/game/update/route.ts`.
- **Task:** Replace `z.any()` with a more specific schema (likely a partial of `GameState`).

### Session Sharing
- **Status:** QR Code component exists (`src/components/qr-code-share.tsx`) but needs verification it's actually used in `LobbyStep`.
- **Task:** `LobbyStep` imports it, so we just need to verify it works as expected (manual test or check logic).

## 3. TODO List

This file documents the roadmap.

### High Priority
- [ ] **Refactor `src/app/game/[roomCode]/page.tsx`**: Support `local` mode by checking the room code format or a URL parameter.
- [ ] **Fix `z.any()`**: In `src/app/api/game/update/route.ts`.
- [ ] **Verify QR Code**: Ensure it's rendered correctly in `LobbyStep`.

### Medium Priority
- [ ] **Create `GameProvider`**: Abstract game state management.
- [ ] **Add Tests for Local Mode**: Ensure `local-game.ts` is fully covered.

### Low Priority
- [ ] **Enhanced Logging**: Add a structured logging utility.

---

## 4. Implementation Details

### `GameProvider` Interface
```typescript
interface GameContextType {
  gameState: GameState | null;
  isLoading: boolean;
  error: string | null;
  actions: {
    updateName: (name: string) => Promise<void>;
    setReady: () => Promise<void>;
    submitAnswer: (answer: string) => Promise<void>;
    nextStep: () => Promise<void>;
    // ... other actions
  };
}
```

### Local Mode Detection
Local games likely have a specific ID format or are stored in a way we can detect. `local-game.ts` uses `local-game:` prefix in localStorage. We might need a route like `/game/local/[id]` to explicitly differentiate, or just handle it in the standard route if IDs don't collide.
