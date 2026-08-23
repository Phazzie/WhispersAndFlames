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

    it("refuses deleting a partner's answer", () => {
      const result = authorizeGameUpdate(game(), BOB, {
        gameRounds: [{ question: 'Q1', answers: { [BOB]: 'bob answer' } }],
      });
      expect(refusal(result)).toMatch(/remove another player's answer/i);
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

  describe('player entries', () => {
    it('allows editing your own entry', () => {
      const updates = allowed(
        authorizeGameUpdate(game(), BOB, {
          players: [player(ALICE), player(BOB, { name: 'Bobby', isReady: true })],
        })
      );
      expect(updates.players?.find((p) => p.id === BOB)?.name).toBe('Bobby');
    });

    it('refuses renaming your partner', () => {
      const result = authorizeGameUpdate(game(), BOB, {
        players: [player(ALICE, { name: 'Not Alice' }), player(BOB)],
      });
      expect(refusal(result)).toMatch(/another player's name/i);
    });

    it("refuses changing your partner's category picks", () => {
      const result = authorizeGameUpdate(game(), BOB, {
        players: [player(ALICE, { selectedCategories: ['Power Play'] }), player(BOB)],
      });
      expect(refusal(result)).toMatch(/another player's selectedCategories/i);
    });

    it('refuses marking your partner ready', () => {
      // Would let one player drive the game forward on the other's behalf.
      const result = authorizeGameUpdate(game(), BOB, {
        players: [player(ALICE, { isReady: true }), player(BOB, { isReady: true })],
      });
      expect(refusal(result)).toMatch(/mark another player ready/i);
    });

    it('allows the bulk un-ready that step transitions depend on', () => {
      // Every step advance resets isReady on everyone. This must keep working.
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
      const picked = game({
        players: [player(ALICE, { selectedSpicyLevel: 'Hot' }), player(BOB)],
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
