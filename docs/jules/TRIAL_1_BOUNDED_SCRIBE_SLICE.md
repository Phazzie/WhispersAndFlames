# WF-JULES-TRIAL-SLICE-001 — Remove player names from Scribe

## Capability being tested

This is a bounded production code slice. Show whether Jules can make one precise privacy correction across a small number of existing modules, preserve established behavior, add focused regression proof, and hand back a clean draft PR without expanding scope.

## Base check — mandatory before all other work

The launch message supplies an exact expected **starting branch** and full expected Git SHA. Jules is expected to create and work on its own `jules-*` branch; that branch name is not a mismatch. Before editing, run `git status --short --branch`, `git rev-parse --abbrev-ref HEAD`, and `git rev-parse HEAD`. The worktree must be clean and the initial HEAD of Jules's branch must equal the supplied SHA, proving that its branch starts from the intended production commit. If HEAD differs or the tree is dirty, make no changes and finish with `BASE_MISMATCH`, showing the observed Jules branch and SHA. Never inspect or print `.env*` files or values. Do not use any legacy checkout, base branch, archive, or copied implementation.

Read root `AGENTS.md`, `PROJECT_STATUS.md`, `docs/PRODUCTION_CORE_EXEC_PLAN.md`, and every nested `AGENTS.md` governing a file before touching it.

## Objective

Remove `playerNames` from the Scribe path end to end. Scribe must receive only the mutually approved sanitized candidate objects. Names are unnecessary private context and are already absent from `buildScribeMessages`; the public port and repository call must now tell the truth about that boundary.

The observable result is that completing a room still produces the same validated Scribe or deterministic fallback summary, while no Scribe port, provider call, mock, or serialized test input contains either player's name.

## Owned paths

Only these paths may change:

- `src/lib/game/ports.ts`
- `src/lib/game/memory-repository.ts`
- `src/lib/game/memory-repository.test.ts`
- `src/lib/ai/index.ts`
- `src/lib/ai/index.test.ts`
- `src/lib/ai/openai-provider.ts`
- existing focused tests under `src/lib/ai/**` only if directly required by this change

Do not change contracts, routes, UI, prompts/persona sources, dependencies, lockfiles, configuration, plans, migrations, or unrelated formatting. Stop and report `SCOPE_GAP` instead of expanding the path list.

## Required behavior and proof

1. `GameAiPort.writeSummary` accepts only `{ approved }`.
2. `MemoryGameRepository` never sends host or guest names into `writeSummary`.
3. `ResilientGameAi` and the OpenAI adapter accept and forward only approved sanitized candidates.
4. Update fixtures and mocks to match the narrower interface.
5. Add or strengthen a regression assertion that serializing the exact Scribe input contains neither test player's name, raw answer text, nor rejected candidate data.
6. Preserve zero-match fallback behavior and existing summary validation.
7. Do not weaken types with casts, `any`, disabled lint rules, skipped tests, or a compatibility field kept around "for later."

Run from the repository root:

    npx vitest run src/lib/ai/index.test.ts src/lib/game/memory-repository.test.ts src/lib/ai/prompts.test.ts src/lib/ai/validation.test.ts
    npm run typecheck
    npm run lint

If a command fails because of your change, repair it within the owned paths. If it fails for an unrelated environment or baseline reason, report the exact command and concise failure without changing unrelated files.

## Handoff

Commit one coherent change on Jules's isolated branch. If Jules offers PR publication, open a **draft PR targeting `production/core-foundation`**, prefix its title with `[Jules trial: slice]`, and state the expected base SHA, changed paths, validation results, and unresolved risk. Never target `fresh-main`, merge, deploy, alter another PR, or auto-fix unrelated CI failures.

The final session response must contain: status (`COMPLETE`, `BASE_MISMATCH`, `SCOPE_GAP`, or `BLOCKED`), commit SHA if any, exact changed paths, validation transcript summary, PR URL if published, and unresolved risks.
