# Whispers and Flames

Fresh implementation of a private two-player conversation game.

Current worktree, verification, PR, deployment, limitations, and next-action status lives in [`PROJECT_STATUS.md`](PROJECT_STATUS.md).

The first milestone is intentionally narrow: two isolated players must create and join a room, receive the same fixed question, submit privately, and synchronize from server-authoritative state. Ember, matching, Scribe, and visual polish follow only after that proof works.

Canonical AI persona material is preserved in `AI_PERSONAS.md` and `aiprompting.md`. No archived implementation code is reused.

## Guest-ready demo branch

`demo/guest-ready` is a fast, cohesive local demo. It uses a server-authoritative in-memory room store so two isolated browsers can play immediately. Rooms disappear whenever the Next.js process restarts; that is an intentional demo limitation, not durable storage.

Run it with:

```bash
npm install
npm run dev
```

Open the printed local URL in two isolated browsers. Create a room in one, enter its six-character code in the other, and complete the private game together. OpenAI powers Ember, match analysis, and Scribe when `OPENAI_API_KEY` is present; curated fallbacks keep the complete flow available when it is not.

To let a second device on the same trusted Wi-Fi open the demo, run `npm run dev:lan` and use the Network URL printed by Next.js. Keep the terminal running for the entire game because this demo's rooms live in that process.
