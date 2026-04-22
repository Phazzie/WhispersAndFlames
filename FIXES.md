# Whispers and Flames — Bug & Alignment Fixes Checklist

> **Generated from codebase audit (2026-04-21)**  
> Items are ranked by ROI: highest-impact, lowest-risk changes first.  
> Check off items as they are completed.

---

## Priority 1 — Critical / Game-Breaking 🔴

These bugs silently break core gameplay. Fix immediately.

### 1.1 AI Category Whitelist Is Fully Stale

**File:** `src/ai/flows/shared-utils.ts` → `validateCategories()`  
**Impact:** Every call to summary, therapist-notes, and question generation flows silently receives an empty category list. The player's category selection is completely ignored by the AI.  
**Root cause:** `shared-utils.ts` validates against 8 old names (e.g. `'Emotional Connection'`). The live categories in `src/lib/constants.ts` have entirely different names (e.g. `'Hidden Attractions'`). Only `'Future Dreams'` matches.  
**Fix:** Replace the hardcoded list with the 10 current category names from `constants.ts`.

- [x] Update `validCategories` array in `shared-utils.ts:validateCategories()` to match `src/lib/constants.ts`
- [x] Add inline comment pointing to `constants.ts` as the source of truth
- [x] Verify no other places in `src/ai/` hardcode the stale category names

---

### 1.2 Storage `update()` Blocks All Existing-Player Mutations

**Files:** `src/lib/storage-memory.ts`, `src/lib/storage-pg.ts`  
**Impact:** Ready-up, name changes, category selection, and spicy level selection all send a `players` update containing only existing players. The guard treats "no new players" as a no-op and returns the old state. These operations silently fail.  
**Root cause:** A race-condition guard meant for join deduplication was placed inside the general-purpose `update()` method instead of the join API route.  
**Fix:** Remove the guard from both storage implementations. The join API route already deduplicates before calling `update()`.

- [x] Remove the `incomingNewPlayers.length === 0 → return currentState` guard from `src/lib/storage-memory.ts`
- [x] Remove the equivalent guard (with `ROLLBACK`) from `src/lib/storage-pg.ts`
- [x] Verify the join API route (`src/app/api/game/join/route.ts`) still checks `playerIds.includes(userId)` before updating

---

### 1.3 Two-Player "Common Category" Highlight Never Renders

**File:** `src/app/game/[roomCode]/steps/categories-step.tsx` line ~104  
**Impact:** In 2-player games (the primary mode), no category is ever highlighted as "mutually selected" even when both players choose the same one. The visual feedback is completely absent for 2-player sessions.  
**Root cause:** `const isCommon = selections.length === players.length && players.length === 3;` — hardcoded `=== 3`.  
**Fix:** Change `players.length === 3` to `players.length >= 2`.

- [x] Change condition to `players.length >= 2 && selections.length === players.length`

---

## Priority 2 — Correctness & Safety 🟠

These bugs produce wrong output or have safety implications.

### 2.1 `safetyLevel: 'explicit'` Is In The Schema And Never Gated

**File:** `src/ai/flows/generate-visual-memory.ts`, `src/lib/image-generation.ts`  
**Impact:** The output schema allows `'explicit'` as a valid safetyLevel. If the AI returns it, `generateSessionImage()` passes the prompt through without any check. Agents.md explicitly states: "The 'explicit' safety level must NEVER be used."  
**Fix:** In `image-generation.ts`, check `result.safetyLevel` after generation. If `'explicit'`, log an error and return `null` to block the image.

- [x] Add guard in `generateSessionImage()`: `if (result.safetyLevel === 'explicit') { logger.error(...); return null; }`
- [x] Add comment in `generate-visual-memory.ts` clarifying why `'explicit'` is in the schema but must never be returned

---

### 2.2 Answer Transcript Is Interleaved Incorrectly (Summary)

**File:** `src/app/game/[roomCode]/steps/game-step.tsx` lines ~101–107  
**Impact:** The Scribe's "find common ground" directive depends on seeing all players' answers to each question. The current `flatMap(r => Object.values(r.answers))` produces a flat array of N_questions × N_players strings. The prompt template does `{{lookup ../answers @index}}` which pairs `answers[0]` to `questions[0]`, `answers[1]` to `questions[1]`, etc. — missing all but the first player's answers.  
**Fix:** Build `answers[i]` as a combined string of all players' named answers for `questions[i]`.

- [x] Replace `flatMap` in `game-step.tsx` with a `map` that combines per-player answers per question: `"PlayerA: '...' | PlayerB: '...'"`
- [x] Update `AnalyzeAnswersInputSchema` description to reflect the new format

---

### 2.3 Answer Transcript Is Interleaved Incorrectly (Therapist Notes)

**File:** `src/app/game/[roomCode]/steps/summary-step.tsx` lines ~63–70  
**Impact:** Same root cause as 2.2. Dr. Ember receives garbled question→answer pairings.  
**Fix:** Apply the same combined-answers-per-question transformation.

- [x] Replace `flatMap` in `summary-step.tsx:loadTherapistNotes()` with the same combined-per-question format
- [x] Update `TherapistNotesInputSchema` description to reflect the new format

---

## Priority 3 — Alignment / Config Mismatches 🟡

Numeric constants, dead imports, and config files that disagree with each other.

### 3.1 Chaos Mode Probability Is a Magic Number

**Files:** `src/lib/game-utils.ts`, `src/lib/api-constants.ts`  
**Impact:** `CHAOS_MODE_UPGRADE_PROBABILITY = 0.2` in `api-constants.ts` is never imported. `game-utils.ts` hardcodes `> 0.8`. If either is changed independently, they silently drift.  
**Fix:** Import and use the constant.

- [x] Import `CHAOS_MODE_UPGRADE_PROBABILITY` in `game-utils.ts`
- [x] Replace `randomValue > 0.8` with `randomValue > (1 - CHAOS_MODE_UPGRADE_PROBABILITY)`

---

### 3.2 Missing Genkit Flow Registrations in `dev.ts`

**File:** `src/ai/dev.ts`  
**Impact:** `generate-therapist-notes` and `generate-visual-memory` flows are absent. They cannot be tested or inspected in the Genkit Developer UI (`npm run genkit:dev`).  
**Fix:** Add the missing imports.

- [x] Add `import '@/ai/flows/generate-therapist-notes.ts'`
- [x] Add `import '@/ai/flows/generate-visual-memory.ts'`

---

### 3.3 PG Connection Timeout Constant Misaligned

**Files:** `src/lib/api-constants.ts`, `src/lib/storage-pg.ts`  
**Impact:** `api-constants.ts` declares `PG_CONNECTION_TIMEOUT_MS = 2_000` but `storage-pg.ts` is hardcoded at `5000`. A developer changing the constant expects it to take effect everywhere — it doesn't.  
**Fix:** Align the constant (5000ms is safer for serverless) and import it in `storage-pg.ts`.

- [x] Update `PG_CONNECTION_TIMEOUT_MS` to `5_000` in `api-constants.ts`
- [x] Import and use `PG_CONNECTION_TIMEOUT_MS`, `PG_IDLE_TIMEOUT_MS`, `DB_POOL_MAX` in `storage-pg.ts`

---

### 3.4 Conflicting `Referrer-Policy` Headers

**Files:** `src/middleware.ts`, `vercel.json`  
**Impact:** Middleware sets `Referrer-Policy: no-referrer`. Vercel config sets `strict-origin-when-cross-origin`. Both fire on Vercel deployments. On other platforms (Docker), only middleware fires. Behavior is inconsistent.  
**Fix:** Remove the duplicate headers from `vercel.json` that are already set by middleware (Referrer-Policy, X-Frame-Options, X-Content-Type-Options, Permissions-Policy). Keep `X-XSS-Protection` in vercel.json only if not set by middleware.

- [x] Remove redundant headers from `vercel.json` that are already set in `src/middleware.ts`

---

## Priority 4 — Dead Code / Vestigial References 🔵

Low risk, low urgency — but they create confusion and false confidence.

### 4.1 `GEMINI_API_KEY` Is Vestigial

**Files:** `src/lib/env.ts`, `src/__tests__/lib/env.test.ts`  
**Impact:** The AI stack was migrated to xAI Grok. `GEMINI_API_KEY` is still in the env schema. No code reads it. It misleads developers into thinking Gemini support exists.  
**Fix:** Remove the field from `env.ts` and the corresponding test assertion.

- [x] Remove `GEMINI_API_KEY` from `envSchema` and `validateEnv()` in `env.ts`
- [x] Remove `expect(env).toHaveProperty('GEMINI_API_KEY')` assertion from `env.test.ts`

---

### 4.2 `DISABLE_SSL_VALIDATION` Is Documented But Not Wired

**Files:** `.env.example`, `src/lib/env.ts`, `src/lib/storage-pg.ts`  
**Impact:** `.env.example` documents `DISABLE_SSL_VALIDATION=false`, but `env.ts` never parses it and `storage-pg.ts` never reads it. Setting this env var has no effect. This is particularly painful for cloud database providers that don't support strict SSL certificate validation.  
**Fix:** Add to `env.ts` schema and use it in `storage-pg.ts`.

- [x] Add `DISABLE_SSL_VALIDATION: z.string().optional()` to `envSchema` in `env.ts`
- [x] Use it in `storage-pg.ts`: `ssl: prod && !DISABLE_SSL_VALIDATION ? { rejectUnauthorized: true } : false`

---

### 4.3 `withAITimeout` Is Exported from `shared-utils.ts` but Never Used

**File:** `src/ai/flows/shared-utils.ts`  
**Impact:** `actions.ts` defines its own `withTimeout()` function doing the same thing. Dead export.  
**Fix:** Remove `withAITimeout` from `shared-utils.ts` (it is not imported anywhere).

- [x] Delete `withAITimeout` function from `src/ai/flows/shared-utils.ts`

---

## Priority 5 — Future Work (Not This Pass) 🗓️

These require larger changes or feature decisions. Track in issues.

### 5.1 Question Generator Is Couple-Only (No `playerCount`)

**File:** `src/ai/flows/generate-contextual-questions.ts`  
**Impact:** `GenerateContextualQuestionsInput` has no `playerCount` field. The prompt always uses "your partner" framing. Trio games get couple-oriented questions.  
**TODO:**

- [ ] Add `playerCount: z.number()` to `GenerateContextualQuestionsInputSchema`
- [ ] Update prompt template to use "your partners" / "your partner" conditionally
- [ ] Pass `gameState.players.length` from `game-step.tsx` and `spicy-step.tsx`

---

### 5.2 Local Mode Turn Tracking Is Unimplemented

**File:** `src/lib/local-game.ts`, `src/app/game/[roomCode]/steps/game-step.tsx`  
**Impact:** `localGame.nextPlayer()` and `localGame.getCurrentPlayer()` are defined but never called. Local mode shows all players the same screen simultaneously instead of taking turns.  
**TODO:**

- [ ] In `game-step.tsx`, detect `gameMode === 'local'` and use `localGame.nextPlayer()` after each answer submission
- [ ] Add a "Pass Device" UI prompt for local mode
- [ ] Implement the pass-device flow in `local-game.ts`

---

### 5.3 `storage.games.delete()` Is Never Called

**Files:** `src/lib/storage-memory.ts`, `src/lib/storage-pg.ts`  
**Impact:** In development (in-memory), games accumulate forever. No route or cron calls `delete()`.  
**TODO:**

- [ ] Add a `/api/game/delete` endpoint or call `delete()` from the cleanup cron after expiry
- [ ] Or wire the cron cleanup to call `storage.games.delete()` for expired games in memory mode

---

### 5.4 Unused Utility Exports (Low-Hanging Cleanup)

**Files:** `src/lib/utils/security.ts`, `src/lib/utils/rate-limiter.ts`, `src/lib/utils/logger.ts`  
**Impact:** `escapeHtml`, `sanitizePath`, `generateSecureToken`, `isValidEmail`, `isSafeString`, `addRateLimitHeaders`, `createRateLimitResponse`, `logApiRequest`, `logSecurityEvent`, `logPerformance` — all exported but never imported. Creates false confidence that more security/logging is in place than actually is.  
**TODO:**

- [ ] Either implement usages for these utilities or mark them `// @internal` / remove them
- [ ] Specifically: `escapeHtml` should be used when rendering user content in the therapist notes download

---

## Status Summary

| Priority       | Total Items | Done   | Remaining |
| -------------- | ----------- | ------ | --------- |
| P1 Critical    | 3           | 3      | 0         |
| P2 Correctness | 3           | 3      | 0         |
| P3 Alignment   | 4           | 4      | 0         |
| P4 Dead Code   | 3           | 3      | 0         |
| P5 Future Work | 4           | 0      | 4         |
| **Total**      | **17**      | **13** | **4**     |
