# Game Server Ownership

Own `src/lib/game/**` except `contracts.ts`, plus server-engine tests. Do not edit UI, AI persona files, package files, or global configuration.

- Treat `contracts.ts` as frozen. Ask root to change it when necessary.
- The repository is server-authoritative and supports exactly two players.
- Build every `RoomView` from an explicit allowlist. Never spread internal room/player objects into a response.
- Never expose the partner's raw preferences, answers, skips, ballot, or source evidence.
- Every mutation verifies the bearer token belongs to the room and the phase permits the operation.
- Make retries idempotent through `operationId` and make duplicate submissions harmless.
- Keep the in-memory adapter replaceable behind a `GameRepository` interface and label its restart-clears-data limit honestly.
- Do not log request bodies, tokens, answers, or AI inputs/outputs.
