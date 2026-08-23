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

1. **The `/answer` slice** — closes a live leak. `GET /api/game/[roomCode]` returns the whole
   game with no projection, so both players' answers are on the wire every 2 seconds; a
   partner's answers are in your browser before you have written yours. The fix needs one new
   route before the projection can work at all — see the appendix to the sealed-answers PRD
   for why a projection alone would 403 every submit. Roughly a day, and it is the first step
   of the per-action work rather than throwaway.
2. **The trio decision** — a decision, not a build. Capping the game at two is a legitimate
   and much cheaper answer than supporting three.
3. **The full consent-gated model** — the product bet: private ballots, mutual-approval
   gating, summaries built only from approved themes.
4. **The rest of the per-action work** — least urgent now that field-level authorization has
   closed the security half of it, and best done once the app's shape has settled.

## What these deliberately are not

None of these proposes resuming an abandoned rebuild. Four exist — a SvelteKit SDD branch, two
Angular repos, and the July `production/core-foundation` demo — and none ever deployed. Their
_designs_ are worth mining, and the sealed-answers PRD does exactly that with the July branch's
privacy model. Their code is not.
