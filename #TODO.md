# Status and Improvements

## Current Status
**Deployment Ready:** Yes. The project is configured for deployment on Vercel, Netlify, and Digital Ocean. `DEPLOYMENT_READY.md` confirms that critical issues have been resolved, and the project builds successfully.

## Proposed "Great System"
To make the setup more accurate, reliable, and better, we propose the following system improvements:

1.  **Unified Game Context (Abstraction Layer):**
    -   **Problem:** The current UI tightly couples to `clientGame` (online) and Clerk authentication. This makes implementing "Local Mode" difficult as it requires duplicate logic or messy conditionals.
    -   **Solution:** Create a `GameProvider` context that exposes a unified interface for game actions (`join`, `update`, `nextStep`, etc.). This provider will use a strategy pattern to switch between `OnlineGameAdapter` (using API + Clerk) and `LocalGameAdapter` (using `localStorage` + `local-game.ts`).
    -   **Benefit:** The UI components won't care if the game is local or online. They just call `game.submitAnswer()` and the adapter handles the rest.

2.  **Robust Error Handling & Telemetry:**
    -   **Problem:** Errors are logged to the console or shown in toasts. In production, we need to know when users face issues.
    -   **Solution:** Integrate a structured logging service (or just a better abstraction) that can optionally send error reports to a service (like Sentry) in the future. For now, a centralized `Logger` service that wraps `console` but adds metadata (context, user ID, game mode) would be a great step.

3.  **Automated Quality Assurance:**
    -   **Problem:** Manual verification is error-prone.
    -   **Solution:** Enhance `husky` pre-commit hooks to run not just linting, but also critical unit tests. Add a GitHub Action for CI that runs the full test suite on every PR.

## TODO List

### High Priority
- [ ] **Unified Game Context**: Refactor `src/app/game/[roomCode]/page.tsx` to use a new `GameContext`.
  - [ ] Create `src/lib/game-context.tsx`.
  - [ ] Implement `OnlineGameAdapter`.
  - [ ] Implement `LocalGameAdapter` wrapping `src/lib/local-game.ts`.
- [ ] **Local Mode UI**:
  - [ ] Update `src/app/game/[roomCode]/page.tsx` to handle `local` route param or context state.
  - [ ] Ensure `LobbyStep`, `GameStep`, etc., work without `me` (user) object requiring an ID from Clerk.

### Medium Priority
- [ ] **Code Quality**:
  - [ ] Fix `z.any()` in `src/app/api/game/update/route.ts` (Ref: `src/app/api/game/update/route.ts`).
- [ ] **Session Sharing**:
  - [ ] Improve `src/components/qr-code-share.tsx` styling and add social share buttons (WhatsApp, etc.).

### Low Priority
- [ ] **Features**:
  - [x] Persist local games across browser sessions more reliably (handle clear cache edge cases).
