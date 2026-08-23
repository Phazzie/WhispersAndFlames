import { describe, it, expect } from 'vitest';

import { authorizeGameUpdate } from '@/lib/game-authorization';
import type { GameState, Player } from '@/lib/game-types';

const ALICE = 'user_alice';
const BOB = 'user_bob';
const MALLORY = 'user_mallory';

function player(id: string, over: Partial<Player> = {}): Player {
  return {
    id,
    name: id === ALICE ? 'Alice' : 'Bob',
    isReady: false,
    email: `${id}@example.com`,
    selectedCategories: ['Hidden Attractions'],
    ...over,
  };
}

function game(over: Partial<GameState> = {}): GameState {
  return {
    step: 'game',
    players: [player(ALICE), player(BOB)],
    playerIds: [ALICE, BOB],
    hostId: ALICE,
    gameMode: 'online',
    commonCategories: ['Hidden Attractions'],
    finalSpicyLevel: 'Medium',
    chaosMode: false,
    gameRounds: [{ question: 'Q1', answers: { [ALICE]: 'alice answer' } }],
    currentQuestion: 'Q1',
    currentQuestionIndex: 0,
    totalQuestions: 5,
    summary: '',
    imageGenerationCount: 0,
    roomCode: 'ABC123',
    ...over,
  };
}

/** Assert the update was refused, and hand back the reason. */
function refusal(result: ReturnType<typeof authorizeGameUpdate>): string {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected refusal');
  return result.reason;
}

/** Assert the update was allowed, and hand back what would be persisted. */
function allowed(result: ReturnType<typeof authorizeGameUpdate>): Partial<GameState> {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`expected allow, got: ${result.reason}`);
  return result.updates;
}

describe('authorizeGameUpdate', () => {
  describe('answers', () => {
    it("refuses writing a partner's answer", () => {
      // The original defect: any participant could fabricate the other's
      // answers, which then fed the AI summary and therapist notes.
      const result = authorizeGameUpdate(game(), BOB, {
        gameRounds: [{ question: 'Q1', answers: { [ALICE]: 'forged', [BOB]: 'bob answer' } }],
      });
      expect(refusal(result)).toMatch(/another player's answer/i);
    });

    it('allows writing your own answer alongside the untouched one', () => {
      // This is the real submit path — read-modify-write of the whole array.
      const updates = allowed(
        authorizeGameUpdate(game(), BOB, {
          gameRounds: [
            { question: 'Q1', answers: { [ALICE]: 'alice answer', [BOB]: 'bob answer' } },
          ],
        })
      );
      expect(updates.gameRounds?.[0].answers).toEqual({
        [ALICE]: 'alice answer',
        [BOB]: 'bob answer',
      });
    });

    it('allows changing your own answer', () => {
      const updates = allowed(
        authorizeGameUpdate(game(), ALICE, {
          gameRounds: [{ question: 'Q1', answers: { [ALICE]: 'revised' } }],
        })
      );
      expect(updates.gameRounds?.[0].answers[ALICE]).toBe('revised');
    });

    it("preserves a partner's answer when the proposal omits it", () => {
      // An earlier version refused this as an attempted deletion. Review was
      // right that it was both redundant and harmful: reconciliation starts
      // from storage, so omission cannot delete — and refusing it would 403 a
      // client that polled before the partner's answer arrived.
      const updates = allowed(
        authorizeGameUpdate(game(), BOB, {
          gameRounds: [{ question: 'Q1', answers: { [BOB]: 'bob answer' } }],
        })
      );
      expect(updates.gameRounds?.[0].answers[ALICE]).toBe('alice answer');
    });

    it('allows appending a new round carrying only your own answer', () => {
      const updates = allowed(
        authorizeGameUpdate(game(), BOB, {
          gameRounds: [
            { question: 'Q1', answers: { [ALICE]: 'alice answer' } },
            { question: 'Q2', answers: { [BOB]: 'bob on q2' } },
          ],
        })
      );
      expect(updates.gameRounds).toHaveLength(2);
    });

    it("refuses a new round pre-loaded with a partner's answer", () => {
      const result = authorizeGameUpdate(game(), BOB, {
        gameRounds: [
          { question: 'Q1', answers: { [ALICE]: 'alice answer' } },
          { question: 'Q2', answers: { [ALICE]: 'forged on q2' } },
        ],
      });
      expect(refusal(result)).toMatch(/another player's answer/i);
    });
  });

  describe('round tampering found in review', () => {
    it('refuses truncating the rounds array', () => {
      // Both storage backends replace gameRounds wholesale, so a shorter array
      // deletes the omitted tail — every answer in it, including the partner's.
      const withTwo = game({
        gameRounds: [
          { question: 'Q1', answers: { [ALICE]: 'a1', [BOB]: 'b1' } },
          { question: 'Q2', answers: { [ALICE]: 'a2', [BOB]: 'b2' } },
        ],
      });
      const result = authorizeGameUpdate(withTwo, BOB, {
        gameRounds: [{ question: 'Q1', answers: { [ALICE]: 'a1', [BOB]: 'b1' } }],
      });
      expect(refusal(result)).toMatch(/remove game rounds/i);
    });

    it('refuses wiping every round', () => {
      const result = authorizeGameUpdate(game(), BOB, { gameRounds: [] });
      expect(refusal(result)).toMatch(/remove game rounds/i);
    });

    it("refuses swapping the question under a partner's answer", () => {
      // Echoes the answer verbatim but changes what it was answering — forging
      // the meaning without altering a character of the answer.
      const result = authorizeGameUpdate(game(), BOB, {
        gameRounds: [
          { question: 'A completely different question', answers: { [ALICE]: 'alice answer' } },
        ],
      });
      expect(refusal(result)).toMatch(/change the question/i);
    });

    it('tolerates a client that has not yet seen the partner answer', () => {
      // Reconciliation starts from storage, so an omitted key preserves rather
      // than deletes. Refusing this would 403 an honest client that polled
      // before the partner's answer landed.
      const updates = allowed(
        authorizeGameUpdate(game(), BOB, {
          gameRounds: [{ question: 'Q1', answers: { [BOB]: 'bob answer' } }],
        })
      );
      expect(updates.gameRounds?.[0].answers).toEqual({
        [ALICE]: 'alice answer',
        [BOB]: 'bob answer',
      });
    });
  });

  describe('creation-only fields', () => {
    it('refuses flipping an online game to local', () => {
      // use-game-session routes every write through localGame.update when it
      // reads 'local'. A server-backed room has no localStorage entry, so this
      // would stop the session accepting writes at all.
      const result = authorizeGameUpdate(game(), BOB, { gameMode: 'local' });
      expect(refusal(result)).toMatch(/game mode cannot be changed/i);
    });

    it('strips gameMode and currentPlayerIndex even when unchanged', () => {
      const updates = allowed(
        authorizeGameUpdate(game(), BOB, { gameMode: 'online', currentPlayerIndex: 1 })
      );
      expect(updates).not.toHaveProperty('gameMode');
      expect(updates).not.toHaveProperty('currentPlayerIndex');
    });
  });

  describe('player entries', () => {
    it('allows editing your own entry', () => {
      const updates = allowed(
        authorizeGameUpdate(game(), BOB, {
          players: [player(ALICE), player(BOB, { name: 'Bobby', isReady: true })],
        })
      );
      expect(updates.players?.find((p) => p.id === BOB)?.name).toBe('Bobby');
    });

    it('ignores an attempt to rename your partner', () => {
      // Asserting the outcome rather than a refusal is the stronger property:
      // the tamper is inert because the entry is taken from storage. Refusing
      // instead would 403 an honest client holding a stale copy of the partner
      // after they renamed themselves between polls.
      const updates = allowed(
        authorizeGameUpdate(game(), BOB, {
          players: [player(ALICE, { name: 'Not Alice' }), player(BOB, { name: 'Bobby' })],
        })
      );
      expect(updates.players?.find((p) => p.id === ALICE)?.name).toBe('Alice');
      expect(updates.players?.find((p) => p.id === BOB)?.name).toBe('Bobby');
    });

    it("ignores an attempt to change your partner's category picks", () => {
      const updates = allowed(
        authorizeGameUpdate(game(), BOB, {
          players: [player(ALICE, { selectedCategories: ['Power Play'] }), player(BOB)],
        })
      );
      expect(updates.players?.find((p) => p.id === ALICE)?.selectedCategories).toEqual([
        'Hidden Attractions',
      ]);
    });

    it('refuses marking your partner ready', () => {
      // Would let one player drive the game forward on the other's behalf.
      const result = authorizeGameUpdate(game(), BOB, {
        players: [player(ALICE, { isReady: true }), player(BOB, { isReady: true })],
      });
      expect(refusal(result)).toMatch(/mark another player ready/i);
    });

    it('refuses a forged reset when nobody was ready', () => {
      // Testing only the proposal would let a caller fake a transition by
      // un-readying themselves too, which costs them one click. Requiring the
      // stored state to be all-ready means the exception is only available
      // when the transition it exists for is actually about to fire.
      const midFlow = game({
        players: [
          player(ALICE, { selectedSpicyLevel: 'Hot', isReady: false }),
          player(BOB, { isReady: false }),
        ],
      });
      const result = authorizeGameUpdate(midFlow, BOB, {
        players: [player(ALICE, { selectedSpicyLevel: undefined }), player(BOB)],
      });
      expect(refusal(result)).toMatch(/outside a reset/i);
    });

    it('refuses un-readying only the partner while staying ready', () => {
      // isBulkReset was computed to tell a real step transition apart from a
      // selective edit, but only guarded the spicy field. Un-readying just the
      // partner is acting on their behalf, and repeating it would hold the game
      // at a step forever by preventing the all-ready transition.
      const bothReady = game({
        players: [player(ALICE, { isReady: true }), player(BOB, { isReady: true })],
      });
      const result = authorizeGameUpdate(bothReady, BOB, {
        players: [player(ALICE, { isReady: false }), player(BOB, { isReady: true })],
      });
      expect(refusal(result)).toMatch(/un-ready another player outside a reset/i);
    });

    it('allows the bulk un-ready that step transitions depend on', () => {
      // Every step advance resets isReady on everyone, firing from all-ready.
      // This must keep working — it is the flow the exception exists for.
      const ready = game({
        players: [player(ALICE, { isReady: true }), player(BOB, { isReady: true })],
      });
      const updates = allowed(
        authorizeGameUpdate(ready, BOB, {
          step: 'categories',
          players: [player(ALICE, { isReady: false }), player(BOB, { isReady: false })],
        })
      );
      expect(updates.players?.every((p) => !p.isReady)).toBe(true);
      expect(updates.step).toBe('categories');
    });

    it("allows clearing a partner's spicy pick during a reset, but not setting one", () => {
      // A real reset fires from all-ready, which is now required for the
      // exception to apply at all.
      const picked = game({
        players: [
          player(ALICE, { selectedSpicyLevel: 'Hot', isReady: true }),
          player(BOB, { isReady: true }),
        ],
      });

      const cleared = allowed(
        authorizeGameUpdate(picked, BOB, {
          players: [player(ALICE, { selectedSpicyLevel: undefined }), player(BOB)],
        })
      );
      expect(cleared.players?.find((p) => p.id === ALICE)?.selectedSpicyLevel).toBeUndefined();

      const forced = authorizeGameUpdate(picked, BOB, {
        players: [player(ALICE, { selectedSpicyLevel: 'Mild' }), player(BOB)],
      });
      expect(refusal(forced)).toMatch(/another player's spicy level/i);
    });

    it("refuses clearing a partner's spicy pick outside a reset", () => {
      // Both call sites that clear a partner's pick un-ready everyone as part
      // of a step transition. Outside that there is no legitimate reason to
      // touch it, and allowing it lets one player grief the other into
      // reselecting mid-flow.
      const picked = game({
        players: [
          player(ALICE, { selectedSpicyLevel: 'Hot', isReady: true }),
          player(BOB, { isReady: true }),
        ],
      });
      const result = authorizeGameUpdate(picked, BOB, {
        players: [
          player(ALICE, { selectedSpicyLevel: undefined, isReady: true }),
          player(BOB, { isReady: true }),
        ],
      });
      expect(refusal(result)).toMatch(/outside a reset/i);
    });

    it('refuses removing a player', () => {
      const result = authorizeGameUpdate(game(), BOB, { players: [player(BOB)] });
      expect(refusal(result)).toMatch(/added or removed/i);
    });

    it('refuses injecting a player', () => {
      const result = authorizeGameUpdate(game(), BOB, {
        players: [player(ALICE), player(BOB), player(MALLORY)],
      });
      expect(refusal(result)).toMatch(/added or removed/i);
    });
  });

  describe('membership and host', () => {
    it('refuses granting a stranger read access via playerIds', () => {
      // playerIds gates GET /api/game/[roomCode], and both storage backends
      // union it — so an accepted id is permanent read access to every answer.
      const result = authorizeGameUpdate(game(), BOB, { playerIds: [ALICE, BOB, MALLORY] });
      expect(refusal(result)).toMatch(/membership cannot be changed/i);
    });

    it('strips playerIds even when it matches, so it can never be a write path', () => {
      const updates = allowed(authorizeGameUpdate(game(), BOB, { playerIds: [ALICE, BOB] }));
      expect(updates).not.toHaveProperty('playerIds');
    });

    it('refuses host seizure', () => {
      const result = authorizeGameUpdate(game(), BOB, { hostId: BOB });
      expect(refusal(result)).toMatch(/host cannot be reassigned/i);
    });

    it('strips an unchanged hostId rather than rewriting it', () => {
      const updates = allowed(authorizeGameUpdate(game(), BOB, { hostId: ALICE }));
      expect(updates).not.toHaveProperty('hostId');
    });
  });

  describe('shared progression', () => {
    it('lets either player advance shared fields', () => {
      // step, chaosMode, finalSpicyLevel and friends are genuinely shared —
      // the game advances when either player triggers it.
      const updates = allowed(
        authorizeGameUpdate(game(), BOB, {
          step: 'summary',
          chaosMode: true,
          finalSpicyLevel: 'Hot',
          currentQuestionIndex: 3,
          summary: 'a summary',
        })
      );
      expect(updates).toMatchObject({
        step: 'summary',
        chaosMode: true,
        finalSpicyLevel: 'Hot',
        currentQuestionIndex: 3,
        summary: 'a summary',
      });
    });

    it('passes through an update that touches nothing owned', () => {
      const updates = allowed(authorizeGameUpdate(game(), BOB, { currentQuestion: 'Q2' }));
      expect(updates.currentQuestion).toBe('Q2');
    });
  });
});
