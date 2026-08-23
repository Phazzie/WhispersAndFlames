# Product requirement docs

Each PRD is grounded in code that was read, not in documentation about the code — a
distinction that matters here, since the largest defect found in August was caused by
trusting a document that claimed to be a single source of truth while nothing loaded it.

Every "current state" claim below cites a file and was verified against `main`.

| PRD                                                                                           | What it's for                                                                                       | Blocked on                                                             |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [Sealed answers and consent-gated discovery](./sealed-answers-and-consent-gated-discovery.md) | Answers never reach the partner; themes are voted on privately; only mutual approvals surface       | A decision: replace the current reveal flow, or add a mode?            |
| [Multi-player (trio) support](./multi-player-support.md)                                      | Closes divergence D1 — three people can join, but question generation cannot be told they exist     | A decision: are trios a product goal, or spec cruft?                   |
| [Per-action endpoints](./per-action-endpoints.md)                                             | Replaces the single whole-object update route; makes forgery unrepresentable and fixes lost updates | Should follow the sealed-answers work, or the routes get written twice |

## Suggested order

1. **Sealed answers** — there is a live leak. `GET /api/game/[roomCode]` returns the whole
   game with no projection, so both players' answers are on the wire every 2 seconds. A
   partner's answers are in your browser before you have written yours.
2. **The trio decision** — a decision, not a build. Capping the game at two is a legitimate
   and much cheaper answer than supporting three.
3. **Per-action endpoints** — the biggest change, and the least urgent now that field-level
   authorization has closed the security half of it.

## What these deliberately are not

None of these proposes resuming an abandoned rebuild. Four exist — a SvelteKit SDD branch, two
Angular repos, and the July `production/core-foundation` demo — and none ever deployed. Their
_designs_ are worth mining, and the sealed-answers PRD does exactly that with the July branch's
privacy model. Their code is not.
