# Open Pull Request Triage

_Snapshot taken 2026-08-20 against `Phazzie/WhispersAndFlames`. Metadata only — no diffs were read._

There are **37 open pull requests**. The oldest is **#10** (`Bump @types/node from 20.17.17 to 24.9.2`), opened 2025-10-31 and now 9.6 months old; five more Dependabot PRs were opened the same day. The largest overlap cluster is **`unified-game-context`** — #45, #46, #47, #51 and #52, five independent draft attempts at the same refactor, all opened within 15 minutes of each other on 2025-12-27 and untouched since. **Nine** of the 37 are Dependabot PRs (seven npm, two GitHub Actions), every one of them at least seven months stale. The remaining 28 fall into six smaller overlap groups plus eleven unrelated singletons.

## How the recommendation was chosen

Recommendations are derived **only** from age, draft status, title, and overlap with other PRs. No diffs, CI results, or review comments were inspected, so nothing here should be treated as a verdict on code quality. The rules applied, in order:

1. Within an overlap group, one member is kept as the survivor — the one whose title covers the most of the group's scope, ties broken by the most recent PR. Every other member gets `close-superseded-by-#N`.
2. A cluster survivor is never closed on age alone; it gets `rebase-and-review` so a human can adjudicate the cluster.
3. Any remaining Dependabot PR older than three months gets `close-stale` — the pinned target versions have long since moved and Dependabot regenerates a current PR on close.
4. Any other remaining PR older than six months gets `close-stale`.
5. Everything else gets `rebase-and-review`, except a non-draft, non-overlapping PR updated within the last 30 days, which gets `merge-candidate`.

Two caveats a human should weigh before acting. First, `ai-review-stack` (#71 → #73 → #74) is a _stacked_ chain — #73 branches off #71 and #74 off #73 — so "superseded by #74" assumes the tip is retargeted onto `main` before the two bases are closed. Second, the six 2025-10-31 Dependabot PRs are all **major**-version bumps, so the grouped `minor-and-patch` bump in #54 does **not** subsume them; they are marked stale on age, not as superseded.

## Triage table

| PR  | Age                     | Title                                                                                                     | Overlap group        | Recommendation            |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------- |
| #10 | 9.6 mo · upd 2025-11-02 | Bump @types/node from 20.17.17 to 24.9.2                                                                  | dependabot-npm       | `close-stale`             |
| #11 | 9.6 mo · upd 2025-11-13 | Bump react-dom and @types/react-dom                                                                       | dependabot-npm       | `close-stale`             |
| #13 | 9.6 mo · upd 2025-11-13 | Bump @hookform/resolvers from 4.1.3 to 5.2.2                                                              | dependabot-npm       | `close-stale`             |
| #14 | 9.6 mo · upd 2025-10-31 | Bump framer-motion from 11.18.2 to 12.23.24                                                               | dependabot-npm       | `close-stale`             |
| #15 | 9.6 mo · upd 2025-11-13 | Bump eslint-config-next from 15.5.6 to 16.0.1                                                             | dependabot-npm       | `close-stale`             |
| #16 | 9.6 mo · upd 2025-11-02 | Bump recharts from 2.15.1 to 3.3.0                                                                        | dependabot-npm       | `close-stale`             |
| #23 | 9.4 mo · upd 2025-11-08 | Fix module-load-time error, remove redundant Vercel config, and fix cron job authentication               | vercel-deploy        | `rebase-and-review`       |
| #24 | 9.4 mo · upd 2025-11-10 | Claude/fix vercel grok deployment 011 c uv gsx2 p11e1ars rb4 hc3                                          | vercel-deploy        | `close-superseded-by-#23` |
| #28 | 9.2 mo · upd 2025-11-12 | **[draft]** Add DISABLE_DATABASE flag to force in-memory storage                                          | —                    | `close-stale`             |
| #37 | 8.9 mo · upd 2026-04-20 | Debug and fix app issues                                                                                  | —                    | `close-stale`             |
| #38 | 8.8 mo · upd 2025-11-24 | Bump actions/checkout from 4 to 6                                                                         | dependabot-actions   | `close-stale`             |
| #41 | 8.1 mo · upd 2025-12-15 | Bump actions/upload-artifact from 5 to 6                                                                  | dependabot-actions   | `close-stale`             |
| #43 | 7.8 mo · upd 2025-12-27 | **[draft]** Deployment Review & TODOs                                                                     | —                    | `close-stale`             |
| #45 | 7.8 mo · upd 2025-12-27 | **[draft]** Implement LocalGameAdapter                                                                    | unified-game-context | `close-superseded-by-#52` |
| #46 | 7.8 mo · upd 2025-12-27 | **[draft]** Implement OnlineGameAdapter                                                                   | unified-game-context | `close-superseded-by-#52` |
| #47 | 7.8 mo · upd 2025-12-27 | **[draft]** Implement Game Adapters for Unified Context                                                   | unified-game-context | `close-superseded-by-#52` |
| #48 | 7.8 mo · upd 2025-12-27 | **[draft]** Verify game authorization and remove stale comment                                            | —                    | `close-stale`             |
| #49 | 7.8 mo · upd 2025-12-27 | **[draft]** Improve Local Mode Persistence and Conflict Resolution                                        | game-state-sync      | `close-superseded-by-#81` |
| #50 | 7.8 mo · upd 2025-12-27 | **[draft]** Improve GameState update type safety                                                          | —                    | `close-stale`             |
| #51 | 7.8 mo · upd 2025-12-27 | **[draft]** feat: Implement Unified Game Context                                                          | unified-game-context | `close-superseded-by-#52` |
| #52 | 7.8 mo · upd 2025-12-27 | **[draft]** Implement Unified Game Context Provider                                                       | unified-game-context | `rebase-and-review`       |
| #53 | 7.8 mo · upd 2025-12-27 | **[draft]** Improve QRCodeShare styling and add share options                                             | —                    | `close-stale`             |
| #54 | 7.0 mo · upd 2026-02-02 | Bump the minor-and-patch group across 1 directory with 44 updates                                         | dependabot-npm       | `close-stale`             |
| #66 | 4.0 mo · upd 2026-04-20 | Add error logging to catch blocks in game actions                                                         | error-logging        | `close-superseded-by-#72` |
| #67 | 4.0 mo · upd 2026-04-20 | **[draft]** Fix React Server Components CVE vulnerabilities                                               | dep-security         | `close-superseded-by-#76` |
| #70 | 4.0 mo · upd 2026-04-21 | Stabilize game state updates to keep players in sync                                                      | game-state-sync      | `close-superseded-by-#81` |
| #71 | 4.0 mo · upd 2026-04-21 | Assessing the impact of recent AI changes                                                                 | ai-review-stack      | `close-superseded-by-#74` |
| #72 | 4.0 mo · upd 2026-04-21 | Improve error logging and handling                                                                        | error-logging        | `rebase-and-review`       |
| #73 | 4.0 mo · upd 2026-04-22 | Resolve merge conflicts with origin/main and clean up .gitignore                                          | ai-review-stack      | `close-superseded-by-#74` |
| #74 | 3.9 mo · upd 2026-04-22 | **[draft]** Address Sourcery review comments: eliminate category drift, deduplicate answer-building logic | ai-review-stack      | `rebase-and-review`       |
| #75 | 3.9 mo · upd 2026-04-22 | Remove debug statements and improve code quality                                                          | —                    | `rebase-and-review`       |
| #76 | 3.9 mo · upd 2026-04-23 | Quick win: Fix critical security vulnerabilities in dependencies                                          | dep-security         | `rebase-and-review`       |
| #78 | 3.6 mo · upd 2026-05-04 | Add Rosentic cross-branch conflict detection                                                              | —                    | `rebase-and-review`       |
| #79 | 2.9 mo · upd 2026-05-24 | Add design.md: Visual identity and design system specification                                            | —                    | `rebase-and-review`       |
| #80 | 1.0 mo · upd 2026-07-21 | **[draft]** Checkpoint production prototype foundation                                                    | —                    | `rebase-and-review`       |
| #81 | 1.0 mo · upd 2026-07-21 | [Jules trial: feature] Replay-safe commands and stale-tab protection                                      | game-state-sync      | `rebase-and-review`       |
| #82 | 1.0 mo · upd 2026-07-21 | [Jules trial: slice] Remove player names from Scribe end-to-end                                           | —                    | `merge-candidate`         |

37 rows, one per open PR.

## Overlap groups at a glance

| Group                  | PRs                               | Survivor | Why grouped                                                                                                                                                                                          |
| ---------------------- | --------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unified-game-context` | #45, #46, #47, #51, #52           | #52      | Five parallel agent attempts at the same context/adapter refactor, all opened 2025-12-27 within 15 minutes. #52 is the newest and its title names the concrete deliverable the other four feed into. |
| `dependabot-npm`       | #10, #11, #13, #14, #15, #16, #54 | none     | Automated npm bumps; all regenerate on close.                                                                                                                                                        |
| `ai-review-stack`      | #71, #73, #74                     | #74      | A stacked chain — branches `copilot/sub-pr-71` and `copilot/sub-pr-73` build on each other. Review as one unit from the tip.                                                                         |
| `game-state-sync`      | #49, #70, #81                     | #81      | All three target concurrent / stale game-state update safety. #81 is the newest and the only recently active one.                                                                                    |
| `error-logging`        | #66, #72                          | #72      | Both add or improve error logging in the same area; #72's title is the superset.                                                                                                                     |
| `dep-security`         | #67, #76                          | #76      | Both patch vulnerable dependencies; #76 is the broader, non-draft one.                                                                                                                               |
| `dependabot-actions`   | #38, #41                          | none     | Automated GitHub Actions bumps.                                                                                                                                                                      |
| `vercel-deploy`        | #23, #24                          | #23      | Both fix Vercel deployment from 2025-11-08; #23 has the specific, legible title while #24's is an auto-generated branch slug.                                                                        |

Eleven PRs have no overlap group: #28, #37, #43, #48, #50, #53, #75, #78, #79, #80, #82.

**These are recommendations only. No pull request has been closed, commented on, labelled, merged, or modified in any way — this document is the sole output of the triage.**
