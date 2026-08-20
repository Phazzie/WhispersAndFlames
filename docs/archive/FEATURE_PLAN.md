# Feature Implementation Plan

## Single-Device Multi-Player Mode

### Overview

Allow 1-3 players to play on the same device without requiring multiple accounts or devices.

### Implementation Status

🚧 **In Progress** - Foundation laid, UI implementation needed

### What's Been Done

1. ✅ Added `GameMode` type ('online' | 'local')
2. ✅ Extended `GameState` with `gameMode` and `currentPlayerIndex`
3. ✅ Created `src/lib/local-game.ts` with localStorage-based game management
4. ✅ Implemented player turn management for local mode

### What's Needed

1. **UI Components**:
   - Add "Play Locally" toggle on home page
   - Create local game setup flow (add 1-3 player names)
   - Modify lobby to show "Player X's Turn" indicator in local mode
   - Update game steps to show current player and handle turn transitions

2. **Game Flow Changes**:
   - In local mode, one player answers at a time
   - After each answer, transition to next player
   - Skip authentication checks in local mode
   - Store game state in localStorage instead of server

3. **Testing**:
   - Add tests for local game utilities
   - E2E tests for local mode gameplay

### Usage Example (Planned)

```typescript
// Creating a local game
const game = localGame.create(['Alice', 'Bob']);
router.push(`/game/local/${game.roomCode}`);

// Getting current player
const currentPlayer = localGame.getCurrentPlayer(gameState);

// Moving to next player
const updated = localGame.nextPlayer(gameState);
```

## Session Sharing Features

### Overview

Make it easy for players to join the same session through multiple methods.

### Implementation Status

✅ **Completed** - Basic room codes work, enhancements planned

### Existing Features

1. ✅ Room codes (6-character alphanumeric)
2. ✅ URL with room code parameter
3. ✅ Copy room code to clipboard

### Planned Enhancements

1. **QR Code Generation**:
   - Generate QR code for room URL
   - Display in lobby for easy scanning
   - Mobile-optimized

2. **Share Links**:
   - "Share" button with native share API
   - Direct links: `https://app.com/join/ABC123`
   - Social media sharing (WhatsApp, SMS, Email)

3. **Improved Room Code Display**:
   - Larger, more prominent display
   - Color-coded segments for easier reading
   - One-click copy with visual feedback

### Implementation Priority

1. **High**: QR Code (can use `qrcode` npm package)
2. **Medium**: Enhanced share UI
3. **Low**: Social media integrations

## Multiple Sessions Support

### Status

✅ **Verified** - Already working

### Evidence

- Each game has unique room code
- Room codes are random and collision-resistant
- Server-side storage supports multiple concurrent games
- No session conflicts observed in testing

### Verification Tests

- Multiple games can be created simultaneously ✅
- Players can join different games concurrently ✅
- Game state is isolated per room code ✅
- No cross-contamination between sessions ✅

## Code Review Findings

### TypeScript `any` Types

**Status**: ⚠️ Needs attention

**Locations**:

- `src/lib/game-types.ts:64` - router type
- Multiple action handlers
- Error catch blocks

**Recommendation**: Replace with proper types or `unknown`

### Code Quality Improvements

1. **Error Handling**:
   - Be more specific with error types
   - Add error boundaries for React components
   - Improve error messages

2. **Component Organization**:
   - Some components are large (200+ lines)
   - Consider splitting into smaller, focused components
   - Extract reusable logic into custom hooks

3. **Performance**:
   - Consider memoization for expensive computations
   - Optimize re-renders with React.memo where appropriate
   - Use useCallback for event handlers passed as props

4. **Accessibility**:
   - Add ARIA labels to interactive elements
   - Ensure keyboard navigation works
   - Add screen reader support

## Next Steps

1. **Immediate** (High Priority):
   - Implement QR code sharing
   - Add enhanced share UI
   - Fix TypeScript `any` types

2. **Short-term** (Medium Priority):
   - Complete single-device mode UI
   - Add local mode tests
   - Implement accessibility improvements

3. **Long-term** (Low Priority):
   - Performance optimizations
   - Component refactoring
   - Advanced sharing features
