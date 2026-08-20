# Next.js 16 upgrade assessment

> **Investigated:** 2026-08-20
> **Branch of record:** trial performed on a throwaway worktree branched from `main` @ `c191bd6`
> **Status:** investigation only — no dependency change was committed with this report.

## Why this was investigated

`next@15.5.6` is inside the vulnerable range of a critical RCE advisory whose fixed
version is `16.3.0-preview.10`. The newest Next 15 release (`15.5.23`) is still inside
that range, so **there is no patched 15.x**. Closing the advisory requires moving to
Next 16. This document records what that actually costs, measured rather than guessed.

## Versions tried

| Package               | Before (`main`) | After (trial)                                |
| --------------------- | --------------- | -------------------------------------------- |
| `next`                | 15.5.6          | **16.3.1**                                   |
| `eslint-config-next`  | 15.5.6          | **16.3.1**                                   |
| `@clerk/nextjs`       | 6.35.1          | **6.39.6** (required — see Failure 2)        |
| `@genkit-ai/next`     | 1.19.3          | **1.25.0** (required — see Failure 3)        |
| `genkit`              | 1.19.3          | **1.25.0** (lockstep with `@genkit-ai/next`) |
| `@sentry/nextjs`      | 9.47.1          | **10.70.0** (required — see Failure 3)       |
| `react` / `react-dom` | 18.3.1          | 18.3.1 — **unchanged, no React 19 needed**   |

`next@16.3.1` still declares `react: "^18.2.0 || ^19.0.0"` as a peer, and `@clerk/nextjs@6.39.6`
still accepts React 18. **A React 19 migration is not part of this upgrade.** That was the
largest suspected cost going in, and it is not real.

## Results

| Check              | Next 15                                    | Next 16                                                | Notes                                                                                                                                       |
| ------------------ | ------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit` | ✅ pass (exit 0, no output)                | ✅ pass (exit 0, no output)                            | No type errors. Next 16 does auto-rewrite `tsconfig.json` on first build (see Note A).                                                      |
| `npx vitest run`   | ✅ 24 files / **241 tests** pass           | ✅ 24 files / **241 tests** pass                       | Identical. No test touched.                                                                                                                 |
| `npx next build`   | ✅ pass (webpack, 16 pages)                | ❌ **fails on stock deps** → ✅ passes after dep bumps | Turbopack is now the default builder. Two blocking failures, both in dependencies, none in `src/`. 2 non-fatal config warnings remain.      |
| `npx next lint`    | ⚠️ deprecation notice, exit 0, 36 warnings | ❌ **command removed** — `next lint` no longer exists  | Replaced by plain `eslint`; `eslint-config-next@16` is flat-config-only, so `.eslintrc.cjs` must be migrated. 6 **new errors** then appear. |

Baseline `next lint` under Next 15 emitted an explicit prophecy of this:

```
`next lint` is deprecated and will be removed in Next.js 16.
```

---

## Failure 1 — `next.config.mjs`: the `eslint` key is gone

**Verbatim (every `next build` / `next dev` invocation on 16):**

```
⚠ `eslint` configuration in next.config.mjs is no longer supported. See more info here: https://nextjs.org/docs/app/api-reference/cli/next#next-lint-options
⚠ Invalid next.config.mjs options detected:
⚠     Unrecognized key(s) in object: 'eslint'
⚠ See more info here: https://nextjs.org/docs/messages/invalid-next-config
```

**Diagnosis.** Next 16 removed the built-in ESLint build step entirely, so
`eslint: { ignoreDuringBuilds: false }` in `next.config.mjs` is no longer a recognized key.
It is a **warning, not an error** — the build completes. But note the behavioral change:
**`next build` no longer runs ESLint at all.** Linting must be an explicit CI step
(`.github/workflows/ci.yml` already runs `npm run lint` separately, so coverage is not lost —
but that script itself is broken, see Failure 4).

The other three options in this repo's config all survive intact and were verified working:

- `output: process.env.VERCEL ? undefined : 'standalone'` — **still supported.** The trial build
  produced `.next/standalone/{server.js,package.json,node_modules}`, so the Docker/DigitalOcean
  deploy path is unaffected.
- `typescript: { ignoreBuildErrors: false }` — **still supported**, no warning; TypeScript still
  runs during `next build` (`Running TypeScript ... Finished TypeScript in 8.7s`).
- `images.remotePatterns` — **still supported**, no warning.

**Size:** small fix. Delete the 3-line `eslint` block from `next.config.mjs`.

---

## Failure 2 — build blocker: `@clerk/nextjs@6.35.1` ships a non-async function in a `"use server"` module

**Verbatim (Turbopack, the Next 16 default):**

```
> Build error occurred
Error: Turbopack build failed with 1 error:
./node_modules/@clerk/nextjs/dist/esm/server/keyless-custom-headers.js:70:10
Error: Server Actions must be async functions.
  68 |   }
  69 | }
> 70 | function formatMetadataHeaders(metadata) {
     |          ^^^^^^^^^^^^^^^^^^^^^
  71 |   const headers2 = new Headers();
  72 |   if (metadata.nodeVersion) {
  73 |     headers2.set("Clerk-Node-Version", metadata.nodeVersion);

Ecmascript file had an error

Import trace:
  Server Component:
    ./node_modules/@clerk/nextjs/dist/esm/server/keyless-custom-headers.js
    ./node_modules/@clerk/nextjs/dist/esm/app-router/server/keyless-provider.js
    ./node_modules/@clerk/nextjs/dist/esm/app-router/server/ClerkProvider.js
    ./node_modules/@clerk/nextjs/dist/esm/index.js
    ./src/app/layout.tsx
```

**This is not a Turbopack-only problem.** Forcing the old bundler with `next build --webpack`
fails identically, because the check lives in SWC, not the bundler:

```
▲ Next.js 16.3.1 (webpack)
Failed to compile.

./node_modules/@clerk/nextjs/dist/esm/server/keyless-custom-headers.js
Error:   x Server Actions must be async functions.

    ,-[.../node_modules/@clerk/nextjs/dist/esm/server/keyless-custom-headers.js:70:1]
 69 | }
 70 | function formatMetadataHeaders(metadata) {
    :          ^^^^^^^^^^^^^^^^^^^^^
    `----
> Build failed because of webpack errors
```

**Diagnosis.** `keyless-custom-headers.js` carries a module-level `"use server"` directive.
Next 16 tightened the rule so that **every** function declared in such a module must be `async`,
not just the exported ones. Clerk 6.35.1's `formatMetadataHeaders` is synchronous. This is a
packaging bug in Clerk, not in this app — no file under `src/` is involved.

**It is already fixed upstream.** In `@clerk/nextjs@6.39.6` the same line reads
`async function formatMetadataHeaders(metadata)` and the build passes. 6.39.6 is a patch/minor
within the existing `^6.35.1` range (no Clerk major migration, no `clerkMiddleware` API change),
and its peer range explicitly lists Next 16: `"next": "^13.5.7 || ^14.2.25 || ^15.2.3 || ^16"`.

**Size:** small fix. `npm install @clerk/nextjs@^6.39.6`. No code change.

---

## Failure 3 — hard `ERESOLVE`: `@genkit-ai/next` and `@sentry/nextjs` peer-block Next 16

The very first `npm install next@16 eslint-config-next@16` _appeared_ to succeed, emitting only
warnings. That is misleading — npm overrode the peers for that one targeted install. **Any
subsequent plain `npm install` is a hard failure.** Verified with `npm install --dry-run`:

```
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: @genkit-ai/next@1.19.3
npm error Found: next@16.3.1
npm error node_modules/next
npm error   next@"^16.3.1" from the root project
npm error   peer next@"^13.5.7 || ^14.2.25 || ^15.2.3 || ^16" from @clerk/nextjs@6.39.6
npm error
npm error Could not resolve dependency:
npm error peer next@"^15.0.0" from @genkit-ai/next@1.19.3
npm error node_modules/@genkit-ai/next
npm error   @genkit-ai/next@"^1.14.1" from the root project
npm error
npm error Conflicting peer dependency: next@15.5.23
```

After bumping Genkit, Sentry surfaces as the next blocker:

```
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: @sentry/nextjs@9.47.1
npm error Found: next@16.3.1
npm error
npm error Could not resolve dependency:
npm error peer next@"^13.2.0 || ^14.0 || ^15.0.0-rc.0" from @sentry/nextjs@9.47.1
npm error node_modules/@sentry/nextjs
npm error   @sentry/nextjs@"^9.18.0" from the root project
npm error
npm error Conflicting peer dependency: next@15.5.23
```

**Diagnosis and resolution for each of the three Next-coupled packages:**

- **`@clerk/nextjs`** — already compatible at 6.35.1's _declared_ peer range (`|| ^16`); the
  problem was the runtime bug in Failure 2, not the peer range. Fixed by 6.39.6.
- **`@genkit-ai/next`** — 1.19.3 declares `peer next@"^15.0.0"`. Next-16 support first lands in
  **1.25.0** (`"next": "^15.0.0 || ^16.0.0"`); 1.20.0 through 1.24.0 are all still `^15.0.0` only.
  1.25.0 pins `genkit` to the **exact** version `1.25.0`, so `genkit` must move from 1.19.3 to
  1.25.0 in lockstep. Both are inside the existing `^1.14.1` ranges — a minor bump, not a major.
- **`@sentry/nextjs`** — **no 9.x release supports Next 16.** Every version through the final
  9.47.1 declares `peer next@"^13.2.0 || ^14.0 || ^15.0.0-rc.0"`. Next 16 support requires the
  **10.x major line** (verified working at 10.70.0, whose peer is
  `"^13.2.0 || ^14.0 || ^15.0.0-rc.0 || ^16.0.0-0"`). Mitigating factor: this repo's Sentry usage
  is shallow — a single `Sentry.captureException(...)` in `src/lib/utils/logger.ts:137`, with no
  `sentry.*.config.ts`, no `instrumentation.ts`, and no `withSentryConfig()` wrapper in
  `next.config.mjs`. The v9→v10 migration surface here is therefore near-zero, but the major bump
  should still get its own verification pass.

With all three bumped, `npm install` resolves cleanly with **no `--legacy-peer-deps` and no
`overrides`** (exit 0), and all four checks were re-run against that tree.

**Size:** small fixes, but three separate dependency bumps — one of which (`@sentry/nextjs`
9 → 10) is a major version and deserves its own review.

---

## Failure 4 — `next lint` no longer exists; `eslint-config-next@16` is flat-config only

**Verbatim, running the repo's own `npm run lint` script on Next 16:**

```
$ npx next lint
Invalid project directory provided, no such directory: <repo>/lint
```

The subcommand is gone, so `next` parses `lint` as a directory argument. This breaks:

- `package.json` → `"lint": "next lint"` and `"lint:fix": "next lint --fix"`
- `.github/workflows/ci.yml:39` → `run: npm run lint` (**CI goes red**)

Falling back to invoking ESLint directly against the existing `.eslintrc.cjs` also fails, because
`eslint-config-next@16` ships **only** a flat-config array (`module.exports = [...]`) and can no
longer be consumed by `extends:`:

```
$ ESLINT_USE_FLAT_CONFIG=false npx eslint src --ext .ts,.tsx

Oops! Something went wrong! :(

ESLint: 9.38.0

TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    |     property 'configs' -> object with constructor 'Object'
    |     property 'flat' -> object with constructor 'Object'
    |     ...
    |     property 'plugins' -> object with constructor 'Object'
    --- property 'react' closes the circle
Referenced from: <repo>/.eslintrc.cjs
```

**Diagnosis.** Two coupled changes: the `next lint` wrapper was removed in favour of calling
ESLint directly, and `eslint-config-next` dropped eslintrc support. `.eslintrc.cjs` must be
replaced by an `eslint.config.mjs` flat config, and the two npm scripts repointed at `eslint`.

A trial `eslint.config.mjs` reproducing the repo's exact rule set (`next/core-web-vitals`,
`@typescript-eslint/recommended`, and the three local rule overrides) was written and it works —
ESLint runs to completion. `--fix` handles 24 of the 37 warnings automatically.

**Size:** small fix, but see Failure 5 — the migration is what exposes the one real code finding.

---

## Failure 5 — 6 **new ESLint errors** from `eslint-plugin-react-hooks` v6

Once the flat config is in place, ESLint reports `43 problems (6 errors, 37 warnings)`. The 37
warnings are the same `import/order` + one `no-unused-vars` set as the Next 15 baseline (36 there;
the delta is noise from slightly different file globbing) — all pre-existing, all warnings.

The **6 errors are new**, and are the only findings in this whole investigation that live in
`src/`. `eslint-config-next@16` ships `eslint-plugin-react-hooks` v6, which adds React-Compiler-backed
correctness rules that did not exist in the Next 15 config.

**5 × `react-hooks/set-state-in-effect`:**

| File                                             | Line  |
| ------------------------------------------------ | ----- |
| `src/app/game/[roomCode]/steps/summary-step.tsx` | 41:7  |
| `src/components/home-page.tsx`                   | 32:7  |
| `src/components/qr-code-share.tsx`               | 53:7  |
| `src/components/ui/carousel.tsx`                 | 100:5 |
| `src/hooks/use-mobile.tsx`                       | 14:5  |

Verbatim (representative — `src/hooks/use-mobile.tsx`):

```
  14:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders

Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
* Update external systems with the latest state from React.
* Subscribe for updates from some external system, calling setState in a callback function when external state changes.

Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).

src/hooks/use-mobile.tsx:14:5
  12 |     };
  13 |     mql.addEventListener('change', onChange);
> 14 |     setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
     |     ^^^^^^^^^^^ Avoid calling setState() directly within an effect
  15 |     return () => mql.removeEventListener('change', onChange);
  16 |   }, []);
  17 |  react-hooks/set-state-in-effect
```

**1 × `react-hooks/purity`** — `src/components/ui/sidebar.tsx:635:26`:

```
  635:26  error    Error: Cannot call impure function during render

`Math.random` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).

  633 |   // Random width between 50 to 90%.
  634 |   const width = React.useMemo(() => {
> 635 |     return `${Math.floor(Math.random() * 40) + 50}%`;
      |                          ^^^^^^^^^^^^^ Math.random
  636 |   }, []);
```

**Diagnosis.** These are genuine (if mild) React correctness smells, newly surfaced rather than
newly introduced — the code is unchanged. Two of the six sit in vendored shadcn/ui components
(`carousel.tsx`, `sidebar.tsx`) that this repo does not really own. Because `next build` no longer
runs ESLint, none of these block a build or a deploy; they only fail the standalone `npm run lint`
CI step.

**Size:** small fix, two viable routes. Either (a) fix the six sites — the `sidebar.tsx` one is a
one-liner (seed the width outside render or accept it as a prop), and the five effect sites are
standard "derive during render / lazy initializer / subscribe-with-callback" rewrites — or (b) set
`react-hooks/set-state-in-effect` and `react-hooks/purity` to `'warn'` in the new
`eslint.config.mjs` to keep CI green, and fix them on a follow-up. Neither is structural.

---

## Non-blocking observations

**Note A — Next 16 rewrites `tsconfig.json` on first build.** It made one mandatory change and one
addition, and reformatted the file (losing Prettier's formatting, which `npm run format` restores):

```
-    "jsx": "preserve",
+    "jsx": "react-jsx",
-  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
+  "include": [..., ".next/dev/types/**/*.ts"],
```

Message emitted: `We detected TypeScript in your project and reconfigured your tsconfig.json file
for you. ... jsx was set to react-jsx (next.js uses the React automatic runtime)`. `tsc --noEmit`
passes both before and after. This should be committed deliberately (and re-formatted) rather than
left as a surprise dirty file.

**Note B — `next dev` writes into `CLAUDE.md`.** Next 16 appends an `<!-- BEGIN:nextjs-agent-rules -->`
block to `CLAUDE.md` on every dev-server start:

```
✓ Generated CLAUDE.md for AI agents. Set `agentRules: false` in next.config to disable.
```

This dirties the working tree for every developer who runs `npm run dev`. Decide deliberately:
either commit the block, or set `agentRules: false` in `next.config.mjs`.

**Note C — the `middleware` convention is deprecated but still works.**

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  To migrate automatically, run:
  npx @next/codemod@canary middleware-to-proxy .
```

`src/middleware.ts` was **not modified** for this trial and works as-is. `clerkMiddleware`, the
`createRouteMatcher` public-route list, the CSP/HSTS header block, and the `config.matcher` array
all survive unchanged — the build output simply relabels it `ƒ Proxy (Middleware)`, and the dev
server logs confirm it executing: `GET /api/health 200 in 668ms (next.js: 489ms, proxy.ts: 151ms)`.
A live smoke test on Next 16 confirmed behavior is preserved: `/api/health` → 200 (public),
`/` → 200 (public), `/profile` → 404 (Clerk `auth.protect()` on an unauthenticated request, which
is the documented and expected response for this app). Renaming to `proxy.ts` is optional cleanup,
not part of this upgrade.

**Note D — the `--turbopack` flag in `"dev": "next dev --turbopack -p 9002"` is still valid.**
`next dev --help` on 16.3.1 still lists `--turbopack`. It is now redundant (Turbopack is the
default) but harmless. `--webpack` exists as an escape hatch for both `dev` and `build`.

**Note E — dynamic route handler signatures needed no change.** `params` being a `Promise` was
already required by Next 15 and this repo already complies; `tsc --noEmit` and `next build` both
pass clean on 16 with `src/app/api/game/[roomCode]/route.ts` and `src/app/game/[roomCode]/`
untouched.

**Note F — build output shrank by one prerendered page** (16 → 15). No route disappeared from the
route table; this is an accounting change in how Next 16 counts prerendered entries, not a missing
page.

---

## Verdict

### **Small fixes needed**

Next 16.3.1 runs this application. Across the whole trial **not one file under `src/` had to be
modified** to compile, build, boot, serve, or pass all 241 tests. There is no React 19 migration,
no App Router restructuring, no `params`/`searchParams` async migration, no middleware rewrite, and
no change to any AI flow, storage adapter, or API route. The advisory can be closed without
touching product code.

The work is dependency and configuration plumbing:

1. **`npm install next@^16.3.1 eslint-config-next@^16.3.1`.**
2. **`npm install @clerk/nextjs@^6.39.6`** — required; 6.35.1 hard-fails the build under both
   Turbopack and webpack (Failure 2). Minor bump within the existing range, no API change.
3. **`npm install @genkit-ai/next@^1.25.0 genkit@^1.25.0`** — required; 1.19.3 peer-blocks Next 16
   and 1.25.0 is the first release supporting it. The two must move together (exact pin).
4. **`npm install @sentry/nextjs@^10`** — required; no 9.x supports Next 16. This is the only
   **major** bump in the set. Low risk here (one `captureException` call, no Sentry config files,
   no `withSentryConfig`), but give it its own review.
5. **Delete the `eslint: { ignoreDuringBuilds: false }` block from `next.config.mjs`** — the key no
   longer exists. Keep `output`, `typescript`, and `images` exactly as they are; all three still work.
6. **Migrate `.eslintrc.cjs` → `eslint.config.mjs` (flat config)** and repoint
   `"lint": "eslint ."` / `"lint:fix": "eslint . --fix"` in `package.json`. `next lint` is gone and
   `eslint-config-next@16` no longer supports eslintrc. Without this, CI fails at
   `.github/workflows/ci.yml:39`.
7. **Handle the 6 new `react-hooks` v6 errors** (5 × `set-state-in-effect`, 1 × `purity`) — fix the
   sites or downgrade those two rules to `warn` in the new flat config. They do not block the build,
   only the lint step.
8. **Commit the `tsconfig.json` changes Next 16 makes automatically** (`jsx: react-jsx`, added
   `.next/dev/types/**/*.ts`), re-formatted with Prettier, and decide on `agentRules` (Note B).

### Biggest obstacle

**The ESLint story, not Next itself.** `next lint` is removed _and_ `eslint-config-next@16` is
flat-config-only, so `.eslintrc.cjs` must be rewritten — and that rewrite is what surfaces 6 new
`eslint-plugin-react-hooks` v6 errors in `src/`. Everything else on the list is a one-line config
edit or an `npm install`. Runner-up: `@sentry/nextjs` 9 → 10 is the only major-version bump forced
by this upgrade.
