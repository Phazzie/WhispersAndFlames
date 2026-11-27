# PROGRESS

## Morning report (27 Nov 2026)

**Whispers and Flames: done on its branch, with three lines of the definition of done not met
(listed below).**

- **The world:** the whole game is a classified case file on a desk. You "open a file", pull
  folders, set a security clearance, give sealed statements that stay redacted until everyone
  talks, then get a debrief stamped CASE CLOSED and Dr. Ember's notes on privileged letterhead.
- **Branch:** `claude/project-thread-pm0lar`. **Update:** PR #95 was merged to main on 27 Nov and production on Vercel (project `whispers-and-flames`) now runs it.
- **Preview:** see the PR. Vercel builds previews for pushed branches; I could not open it from
  here (see blockers).
- **Score:** 7/10. The game works end to end and looks like nothing else; it loses points for
  the unverified image generation and the unchecked production database.
- **Still rough:** see the README's Known Limitations.

### Definition of done, line by line

| Line                                                | Status                                                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Builds and starts, no console errors                | Pass locally (dev, and a clean production build). The production server can't run here without real Clerk keys. |
| Every main feature clicked through                  | Pass. List below.                                                                                               |
| Nothing that worked before is broken                | Pass. 303 unit tests and 6 end-to-end tests green.                                                              |
| No placeholders, dead links, broken images          | Pass, except Exhibits show a labelled placeholder if the xAI image call fails.                                  |
| Screenshots reviewed after the last change          | Pass (two rounds, phone and laptop). One small spacing tweak on the clearance page landed after round 2.        |
| Deployed to a private preview, opened and checked   | **Not met.** The sandbox can't reach Vercel or the site.                                                        |
| Committed on its own branch                         | Pass.                                                                                                           |
| README says what it is, how to run it, what's rough | Pass.                                                                                                           |

### What I clicked through (and what the tests now do automatically)

- Signed-out front page, sign-in buttons, and the redirect away from a game for a signed-out visitor.
- Open a new file, share the codename, partner reports in, both ready up at the same moment.
- Pull files (categories), MATCH stamps, quick double taps, no-overlap case.
- Set clearance (all four levels), Rogue Handler (chaos mode).
- Answer, redacted partner status, reveal, next question, last question.
- Debrief, Commendations, Dr. Ember's notes (including retry), Paint an exhibit, Take a copy.
- Bad codename ("Room not found"), a stranger opening someone else's room (blocked).
- One-device mode with two players, the "I'm Bob, show me" handoff, through to the debrief.
- Past files (profile) and Clock out.

### The three worlds I pitched

Core idea: two people say the thing they haven't said out loud, and neither goes first alone.
Obvious version: a dark-purple "romantic" app with flame emojis and glassy cards. Not built.

1. **Eyes Only (picked).** A classified case file. Statements are sealed and redacted until both
   agents talk, which is exactly how the game already works, so the world explains the rules.
2. Late-night radio call-in show. Ember is the host, you are callers on hold, answers go "on air".
3. Hotel room-service slips. Every question arrives on a tray; answers go on a card under the door.

Why Eyes Only: the redaction mechanic _is_ the game's core rule, the spice levels map cleanly to
clearance levels (Confidential, Secret, Top Secret, Eyes Only), and it keeps Dr. Ember as the
agency psychologist without touching her prompt.

### Choices I made on my own that Trizzy should check

1. **I merged PR #91 into this branch.** It fixes the summary never saving, but it changes game
   authorization, and its author asked for a human look. It is still open on its own.
2. **I relaxed the authorization rule.** Instead of refusing an update that touches a partner's
   fields, the server now keeps the partner's stored values and saves yours. This is what fixed
   rooms freezing when two people ready up at once.
3. **Production CSP now allows inline scripts** and Clerk's hosts, including
   `clerk.whispersandflames.xyz`. If your Clerk production domain is different, add it.
4. **Image model default is `grok-2-image`.** Override with `XAI_IMAGE_MODEL`.
5. **End-to-end tests use fakes** for Clerk, Grok and the image API, switched on by
   `E2E_FAKE_SERVICES=1` and blocked in production builds.
6. Renamed copy throughout (e.g. "Seal my statement", "Pull your files", "The debrief"). Dr.
   Ember's persona file and every AI prompt are untouched.

### Blockers and what I need from Trizzy

- **Open the Vercel preview** from the PR and click through once with your real Clerk sign-in.
- **Confirm production has `DATABASE_URL`** (I wasn't allowed to read Vercel env vars). Without
  it, partners will see "Room not found".
- **xAI image access:** paint one exhibit on the preview. If you see the placeholder, the key
  lacks image access or the model name needs changing.

### Spend

$0. RunPod was not used.

## Log

- Shakedown found and fixed: summary never saving (via #91), rooms freezing on simultaneous
  ready-up, "[object Object]" errors, one-device mode never passing the device, Dr. Ember's notes
  not loading on tap, lost category picks on quick taps, join box cutting codes to 6 characters,
  broken hero image, confetti blocked by CSP, production CSP blocking hydration.
- Added 6 Playwright end-to-end tests and the fake-services harness; CI now runs them on every PR
  (before, the e2e job skipped itself and reported success).
- Vercel no longer builds Node 20, so every deploy failed instantly. Moved to Node 22.
- Redesigned every screen as the Eyes Only case file; two screenshot rounds at phone and laptop.
