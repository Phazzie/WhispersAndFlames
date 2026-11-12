# Origin CI (Depot)

GitHub Actions is billing-locked on this account and will not run. The same
checks live in [`.depot/workflows/ci.yml`](../.depot/workflows/ci.yml) and run
on Cursor Origin through the Depot app, on `depot-ubuntu-24.04`, after this
repository is detached from GitHub. Until that detach, Depot does not fire.

`.github/workflows/` stays in the tree so the old definitions are still
readable. Nothing here deletes them.

Node is **20**, matching `package.json` `engines` and the GitHub workflows.
Installs are `npm ci` against `package-lock.json`.

## Workflow map

| GitHub workflow                              | When it runs                                                     | Depot job   | Commands                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `.github/workflows/ci.yml` job `test`        | push to `main`, pull requests into `main`                        | `verify`    | `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `node --test scripts/ai-review.test.mjs`, `npm run build` |
| `.github/workflows/ci.yml` job `e2e`         | pull requests only, and only when both Clerk e2e secrets are set | `e2e`       | `npm ci`, `npx playwright install --with-deps`, `npm run test:e2e`                                                       |
| `.github/workflows/security.yml` job `audit` | push to `main`, pull requests into `main`                        | `audit`     | `npm ci`, `npm audit --audit-level=moderate` (continues on failure), then `npm audit --audit-level=high` (fails the job) |
| —                                            | pull requests only                                               | `ai-review` | `npm ci`, `node scripts/ai-review.mjs`                                                                                   |

`verify` exports the same dummy Clerk and xAI values as the GitHub `test`
job (`pk_test_dGVzdC1jbGVyay1kdW1teS5jbGVyay5hY2NvdW50cy5kZXYk`,
`sk_test_dummy`, `xai-dummy`). Those are not Depot secrets. Keep them in
sync with `.github/workflows/ci.yml` and `docs/SUBAGENT_TICKETS.md`.

The e2e gate is unchanged: both `E2E_CLERK_PUBLISHABLE_KEY` and
`E2E_CLERK_SECRET_KEY` must be non-empty or the job prints a skip line and
does not install browsers. Placeholder keys cannot pass Playwright.
`clerkMiddleware` redirects every browser request to a handshake host that
does not exist for a dummy key.

The audit job is that GitHub security workflow with the same outcomes:
moderate findings are printed and do not fail the job; high or critical
findings do. Moderate advisories can remain. The high check is what fails
the job.

`ai-review` calls Grok (`grok-4.5` on `https://api.x.ai/v1/chat/completions`)
with `XAI_API_KEY`. With the key unset it prints `AI review skipped` and
exits 0. With a pull request number and no GitHub token it posts via:

```bash
origin pr comment "$PR_NUMBER" --body-file "$FILE" --edit-last --create-if-none
```

If the `origin` binary is missing, or that comment command fails, the review
text is printed to the log and the job still exits 0. An empty diff skips
without calling xAI. A failed xAI response (key set, API error) exits 1.

When `GITHUB_TOKEN` and `GITHUB_REPOSITORY` are both set, the script updates
a single GitHub issue comment instead, matching the Street Royalty reviewer
this job was adapted from. Depot should not define those two for this job
after the detach, or the comment goes to GitHub rather than Origin.

## GitHub-only, dropped on Depot

These triggers and steps exist only in `.github/workflows/` and are not
reimplemented:

- **`security.yml` schedule** — Mondays 09:00 UTC. Depot's workflow file
  runs the audit on pull requests and pushes to `main` only.
- **`security.yml` `workflow_dispatch`** — manual GitHub "Run workflow"
  button. No Depot equivalent.
- **`e2e` GitHub Environment** — required reviewers on
  `Settings → Environments → e2e`, so pull-request code cannot read the
  Clerk e2e secrets before a person approves. Depot has no such
  environment. Whoever can edit Depot secrets can expose them to this
  workflow, and a pull request runs `npm ci` (lifecycle scripts) in the
  job that receives those secrets. Add the e2e secrets only if that trade
  is acceptable.
- **`actions/upload-artifact`** — the Playwright HTML report
  (`playwright-report/`, 30-day retention). Depot does not upload it.
  A failed e2e run still prints Playwright's log.
- **`::notice::` workflow command** — the skip message is a plain `echo`.

Also GitHub-only, and not a workflow file: [`.github/dependabot.yml`](../.github/dependabot.yml)
(npm and GitHub Actions update PRs). Detach stops Dependabot.

## Not CI

Hosting config is separate from this workflow. The README treats **Vercel**
as the deploy target (`vercel.json`, including the midnight
`/api/cron/cleanup` cron). `netlify.toml` is also in the repo (Node 20,
`npm run build`) and is not referenced by the README. Neither file is
invoked by Depot. Vercel and Netlify keep their own environment variables.

`CRON_SECRET` is a runtime secret for that cleanup route when `DATABASE_URL`
is set. It is not read by CI.

## Secrets to enter in Depot

| Secret                      | Required | Used by                                                                                                                               |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `XAI_API_KEY`               | No       | `ai-review`. Unset skips the review and the job stays green. This is the real xAI key, not the `xai-dummy` value `verify` hard-codes. |
| `E2E_CLERK_PUBLISHABLE_KEY` | No       | `e2e`. Both Clerk secrets must be set or Playwright does not run. Use a Clerk **development** instance.                               |
| `E2E_CLERK_SECRET_KEY`      | No       | `e2e`, paired with the publishable key above.                                                                                         |

No other Actions secrets are referenced. App secrets for production
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `XAI_API_KEY`,
`DATABASE_URL`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`) stay on Vercel.
