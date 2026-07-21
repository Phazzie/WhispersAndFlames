# Client Experience Ownership

Own `src/components/**`, `src/app/page.tsx`, `src/app/layout.tsx`, and `src/app/globals.css`. Do not edit server routes, game/AI libraries, package files, tests outside owned UI paths, or canonical persona documents.

- Consume only `RoomView` and documented API responses. Never infer or mutate authoritative phase state in the browser.
- Persist only `roomId` and the player's bearer token in `sessionStorage`; never persist answers, ballots, or preferences.
- Poll the snapshot endpoint while a session is active, with clear waiting/retry states and cleanup on unmount.
- Make the complete eight-question flow fast, responsive, keyboard usable, and readable at 390px and desktop widths.
- Build a distinctive candlelit, intimate visual system without explicit imagery. Maintain strong contrast and visible focus.
- Every action needs disabled/loading/error feedback. Never display a partner's raw private input.
