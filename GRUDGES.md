# GRUDGES

Things that failed silently or lied. Read this before every deploy.

- **Production CSP blocked the app's own scripts.** `script-src 'self'` with no nonce blocks the
  inline `<script>` tags Next.js puts on every prerendered page (9 on the home page), plus
  Clerk's JS. Nothing errors at build time; the page just never wakes up. Fixed on
  `claude/project-thread-pm0lar`. Check the browser console on the preview before trusting it.
- **The summary never saved on main.** The update schema rejected `completedAt`, so the debrief
  write 400'd. Fixed by PR #91, which this branch includes.
- **Two people readying up at the same moment froze the room.** The server answered 403 ("Cannot
  un-ready another player") and the client showed "[object Object]". Fixed.
- **In-memory storage is per process.** In `next dev` every route had its own copy, so joining
  a room you had just made said "Room not found". On Vercel without `DATABASE_URL` the same
  thing happens across serverless instances. Production needs a real database.
- **One-device mode never passed the device.** Nobody ever called `nextPlayer`, so player 1
  answered for everyone. Fixed, with a handoff screen.
- **Image generation was a fake that looked real.** It always returned a gradient SVG. It now
  calls xAI and only falls back to a placeholder that says it is one.
- **GitHub Actions is billing-locked on this account.** Every CI job "fails" in about 2 seconds
  without running. A red X here means nothing about the code; run the checks locally.
- **A production build run while `next dev` is up shares `.next` and produces a broken
  middleware** (`EvalError: Code generation from strings disallowed`). Stop the dev server and
  delete `.next` first. Output is `standalone`, so start with `node .next/standalone/server.js`.
- **Playwright's bundled browser didn't match the installed one in the sandbox.** Set
  `PW_CHROMIUM_PATH`.
- **The home page hero image (storage.googleapis.com) was a 404.** Removed in the redesign.
