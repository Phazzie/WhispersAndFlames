# Dependency & Dead-Code Research

> Read-only investigation, 19 Aug 2026. Findings only — no code was changed.
> Inputs for the dependency-bump wave.

## 1. The Genkit tree is not prunable while Genkit is used

`npm audit --omit=dev` reports 101 production advisories; roughly 95 arrive
through Genkit's transitive tree (Firebase, Google Cloud Storage, Firestore,
the full OpenTelemetry instrumentation set). The obvious question is whether
that tree can be trimmed. It cannot:

```
nextn@0.1.0
`-- genkit@1.19.3
  `-- @genkit-ai/core@1.19.3
    `-- @genkit-ai/firebase@1.19.3
```

`@genkit-ai/firebase` and `@genkit-ai/google-cloud` are **hard dependencies of
`@genkit-ai/core`**, not optional peers. `@genkit-ai/core` additionally requires
`@opentelemetry/sdk-node`, `@opentelemetry/exporter-jaeger`, `express`, and
`body-parser`. No source file in `src/` imports Firebase or Google Cloud
directly — the app talks only to xAI through `genkitx-openai`.

**Conclusion:** the only way to drop that tree is to drop Genkit.

### How much Genkit does this app actually use?

The entire surface, across four flow files:

| Usage                        | Count               |
| ---------------------------- | ------------------- |
| `ai.definePrompt({...})`     | 4                   |
| `ai.defineFlow(...)`         | 4                   |
| `import { z } from 'genkit'` | 4 (a zod re-export) |
| `genkit({ plugins: [...] })` | 1 (config only)     |

That is a thin wrapper over "send a prompt to an OpenAI-compatible endpoint and
validate the response with zod." Replacing it with direct calls to xAI's
OpenAI-compatible API (`https://api.x.ai/v1`) plus the `zod` already in
`package.json` is a bounded piece of work and would eliminate the large
majority of the outstanding advisories.

**Recommendation:** treat "migrate off Genkit" as a real option rather than a
last resort, but scope it as its own project — it touches the four AI flows,
which `CLAUDE.md` flags as core to the product experience and not to be
modified casually.

## 2. Sentry is dead code

`@sentry/nextjs` is a production dependency. `src/lib/utils/logger.ts:6` imports
it and line 135 calls `Sentry.captureException(...)`, guarded by
`process.env.SENTRY_DSN`.

Nothing initializes it:

- no `Sentry.init()` anywhere in the repository
- no `instrumentation.ts` (the hook the Next.js SDK requires)
- no `sentry.client.config.*` / `sentry.server.config.*` / `sentry.edge.config.*`
- no `withSentryConfig` wrapper in `next.config.mjs`

**Consequence:** setting `SENTRY_DSN` in production would make the logger take
the reporting branch and still report nothing. The observability the code
appears to provide does not exist.

`@sentry/nextjs` also pulls its own copy of the OpenTelemetry instrumentation
tree — visible as `Critical dependency` warnings from
`@sentry/node/.../instrumentation.js` on every build.

**Two honest options, both small:**

1. **Wire it up** — add `instrumentation.ts` with `Sentry.init({ dsn: env.SENTRY_DSN })`
   and the config files the SDK expects. Requires a real DSN to verify.
2. **Remove it** — drop the import and the `captureException` call from
   `logger.ts`, remove `@sentry/nextjs` from `package.json`. Structured logs
   still go to stdout, which is what the app actually relies on today.

Option 2 also removes a slice of the advisory count. Either way, the current
half-wired state should not persist: it misleads anyone reading the logger.

**Note:** whichever is chosen, it edits `package.json` / `package-lock.json`,
so per `docs/SUBAGENT_TICKETS.md` it must run alone in its own wave.

## 3. `/prototype` is a harmless design mockup

`src/app/prototype/page.tsx` — 161 lines, `'use client'`, renders a
Framer-Motion animation of the four spicy-level cards. It holds no data, calls
no API, and reads no user state.

It is **not** in the `isPublicRoute` matcher, so it already requires
authentication; it is not an information-disclosure risk. It is simply dead
UI: a design study that outlived its purpose.

**Recommendation:** low priority. Delete it, or keep it deliberately as a
living style reference — but say which, because right now it exists by accident.
