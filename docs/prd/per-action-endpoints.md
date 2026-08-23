# PRD: Per-action endpoints

> **Status:** proposed
> **Author:** Bellows (Claude Code session `01C3XLMYKmTzL4vYumhpSWNp`)
> **Date:** 2026-08-23
> **Verified against:** `main` @ `31f6bc9`

---

## Summary

Every game action goes through one endpoint that accepts the whole game object. This
proposes replacing it with endpoints that accept a single action — which makes a class of
bug **unrepresentable** rather than checked, and fixes a live data-loss issue on the way.

---

## The problem

### One route, every field

`POST /api/game/update` takes a `Partial<GameState>` and applies it. Clients read the whole
game, mutate a copy, and post it back — twenty call sites across five step components.

Field-level authorization now guards this (`src/lib/game-authorization.ts`), so a caller
cannot write their partner's answers. But that is a **check**, and checks are things you can
forget to extend. Every new field on the schema is a new field someone has to remember to
reason about.

### Lost updates, live today

Eight call sites send the entire `players` array to change one flag:

```ts
const updatedPlayers = gameState.players.map((p) => (p.id === me.id ? { ...p, isReady: true } : p));
await updateGameState({ players: updatedPlayers });
```

Two players acting within the same poll interval: the second read is stale, and the second
write silently discards the first. Nobody is told. The most likely visible symptom is a
readiness toggle that appears to not register.

### A comment that describes a mechanism that isn't there

`game-step.tsx`, on the answer submission path:

```ts
// Optimistic read-modify-write with race condition handling
// This reads the latest state from the server before updating
```

It does not read the latest state from the server. It reads the local `gameState` prop. The
comment has presumably discouraged at least one person from looking closer.

---

## The proposal

Replace the single update route with endpoints that name what happened:

```
POST /api/game/[roomCode]/answer       { questionIndex, text }
POST /api/game/[roomCode]/ready        { ready }
POST /api/game/[roomCode]/categories   { categories }
POST /api/game/[roomCode]/spicy        { level }
POST /api/game/[roomCode]/advance      { toStep }
```

Each takes only what that action needs. The server derives the actor from the session and
performs the merge.

Two properties follow, neither of which requires a check:

- **Forgery becomes unrepresentable.** `/answer` writes `answers[session.userId]`. There is
  no field in which to name another player, so there is nothing to validate.
- **Lost updates disappear.** The server merges one field instead of accepting a
  wholesale array, so two concurrent actions compose instead of clobbering.

### Optimistic concurrency where it is still needed

Step transitions genuinely depend on prior state ("advance when everyone is ready"). Those
carry an `expectedVersion`, and the server refuses on mismatch so the client can re-read.

This is the design `production/core-foundation` reached in July, and PR #81's
`expectedVersion` work — recorded in that branch's own ledger as **rejected as a merge
candidate** — is worth reading before rebuilding it, as a source of ideas rather than code.

---

## Scope

### In

- New per-action routes with narrow schemas.
- `useGameSession` gains a method per action, replacing `updateGameState`.
- The five step components move to those methods.
- `version` on game state; `expectedVersion` on transitions.
- `POST /api/game/update` deleted once nothing calls it.

### Out

- Sealed answers and consent gating. Complementary, separable — see
  `sealed-answers-and-consent-gated-discovery.md`. **If both are planned, do that one first**:
  it changes what the endpoints return, and doing it second means writing these routes twice.
- Real-time transport. Polling stays; this is orthogonal.
- Trio support.

---

## Acceptance criteria

1. No endpoint accepts a player id in its body. The actor is always the session.
2. Two concurrent readiness toggles both land — asserted by a test with genuinely interleaved
   requests, not two sequential ones.
3. A step transition against a stale `expectedVersion` is refused, and the client recovers by
   re-reading rather than surfacing an error.
4. `POST /api/game/update` no longer exists.
5. The existing two-player integration test still passes, adapted to the new methods.

Criterion 2 is the one that must not be faked. A test that awaits one request before starting
the next proves nothing about the bug this exists to fix.

---

## Risks

**This rewrites the hot path of a working game.** Every step component changes. It is the
largest change proposed in any of these PRDs, against an app that currently works. It wants
its own branch, its own review, and a real two-browser run before merge — not just green CI.

**Field-level authorization already closed the security half.** The forgery hole is shut
today. What remains is lost updates and structural durability. That is real, but it is not
urgent in the way the authorization gap was, and this should be sequenced accordingly.

**Partial migration is worse than either end.** Two write paths — some components on new
routes, some on the old one — means two concurrency models at once. If this is started, it
should be finished.

---

## Recommendation

**Split it.** The `/answer` route should come first and soon; the rest can wait.

`sealed-answers-and-consent-gated-discovery.md` documents a live leak — the GET route sends
both players' answers to both clients every 2 seconds. Fixing it requires the client to stop
posting whole `gameRounds` arrays, because field-level authorization refuses a redacted
array as tampering. So `/answer` is not merely the first slice of this work, it is a
prerequisite for closing a privacy hole that exists today.

Suggested order:

1. **`/answer` plus the answer projection** — closes the leak. One route, one component,
   one projection.
2. **The trio decision** — a decision, not a build.
3. **The rest of this PRD** — `/ready`, `/categories`, `/spicy`, `/advance`, `expectedVersion`,
   and deleting the update route. Least urgent now that authorization has closed the security
   half, and best done once the app's shape has settled so the rewrite happens only once.
