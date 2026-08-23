import type { GameRound, GameState, Player } from './game-types';

/**
 * Field-level authorization for game updates.
 *
 * `POST /api/game/update` verifies the caller is a participant and then applies
 * whatever fields arrived. Since the client posts the whole game object, any
 * participant could rewrite their partner's answers, rename them, change their
 * category picks, mark them ready, or remove them from the game.
 *
 * The clients legitimately send whole `players` and `gameRounds` arrays — every
 * step does a read-modify-write — so this reconciles the proposed state against
 * the stored state per field rather than rejecting bulk writes outright. That
 * keeps every existing flow working while making forgery unrepresentable.
 *
 * Two write shapes are legitimate for `players`, and the rule has to admit both:
 *
 *   1. Self-edit — the caller changes their own entry (name, categories,
 *      readiness, spicy pick).
 *   2. Bulk un-ready — a step transition clears `isReady` on *everyone* so the
 *      next screen starts fresh. Any player triggers this once all are ready.
 *
 * So: you may do anything to your own entry, and for everyone else's you may
 * only *lower* readiness and clear their spicy pick. Marking a partner ready is
 * refused — that would let one player drive the game forward on the other's
 * behalf, which is the same class of problem as forging their answers.
 */

export type AuthorizationResult =
  | { ok: true; updates: Partial<GameState> }
  | { ok: false; reason: string };

/** Fields on another player's entry that a caller may never change. */
const IMMUTABLE_PLAYER_FIELDS = ['id', 'name', 'email', 'selectedCategories'] as const;

function samePlayerIds(stored: Player[], proposed: Player[]): boolean {
  if (stored.length !== proposed.length) return false;
  const storedIds = new Set(stored.map((p) => p.id));
  return proposed.every((p) => storedIds.has(p.id));
}

/**
 * Reconcile a proposed players array against what is stored.
 *
 * Returns the array that should actually be persisted, or a reason it was
 * refused. The caller's own entry is taken from the proposal verbatim; every
 * other entry is taken from storage except for the two reset fields.
 */
function authorizePlayers(
  stored: Player[],
  proposed: Player[],
  callerId: string
): { ok: true; players: Player[] } | { ok: false; reason: string } {
  // A step transition un-readies everyone, and the two call sites that clear a
  // partner's spicy pick both do it as part of that. Outside such a reset there
  // is no legitimate reason to touch another player's pick, so recognising the
  // reset explicitly stops "clear" being a standing permission.
  const isBulkReset = proposed.every((p) => !p.isReady);
  // The player set changes through create/join only, never through update.
  if (!samePlayerIds(stored, proposed)) {
    return { ok: false, reason: 'Players cannot be added or removed by a game update' };
  }

  const byId = new Map(proposed.map((p) => [p.id, p]));
  const reconciled: Player[] = [];

  for (const storedPlayer of stored) {
    const proposedPlayer = byId.get(storedPlayer.id);
    if (!proposedPlayer) {
      return { ok: false, reason: 'Players cannot be added or removed by a game update' };
    }

    if (storedPlayer.id === callerId) {
      // Your own entry is yours to change.
      reconciled.push(proposedPlayer);
      continue;
    }

    for (const field of IMMUTABLE_PLAYER_FIELDS) {
      const before = JSON.stringify(storedPlayer[field]);
      const after = JSON.stringify(proposedPlayer[field]);
      if (before !== after) {
        return { ok: false, reason: `Cannot modify another player's ${field}` };
      }
    }

    // Raising another player's readiness is acting as them.
    if (proposedPlayer.isReady && !storedPlayer.isReady) {
      return { ok: false, reason: 'Cannot mark another player ready' };
    }

    // Lowering it is only legitimate as part of the bulk reset, which every
    // step transition performs on all players at once. Un-readying just the
    // partner is equally acting on their behalf, and repeated it would hold
    // the game at a step indefinitely by preventing the all-ready transition.
    if (!proposedPlayer.isReady && storedPlayer.isReady && !isBulkReset) {
      return { ok: false, reason: 'Cannot un-ready another player outside a reset' };
    }

    // Their spicy pick may be cleared by that reset, but never set, and never
    // cleared outside one.
    const spicyChanged = proposedPlayer.selectedSpicyLevel !== storedPlayer.selectedSpicyLevel;
    if (spicyChanged && proposedPlayer.selectedSpicyLevel !== undefined) {
      return { ok: false, reason: "Cannot change another player's spicy level" };
    }
    if (spicyChanged && !isBulkReset) {
      return { ok: false, reason: "Cannot clear another player's spicy level outside a reset" };
    }

    reconciled.push({
      ...storedPlayer,
      isReady: proposedPlayer.isReady,
      selectedSpicyLevel: proposedPlayer.selectedSpicyLevel,
    });
  }

  return { ok: true, players: reconciled };
}

/**
 * Reconcile proposed game rounds against storage.
 *
 * A round's `answers` map is keyed by player id. The caller may write their own
 * key and no other — this is the check whose absence let one partner fabricate
 * the other's answers, which then fed the AI summary and therapist notes.
 *
 * Questions themselves are shared progression, so rounds may be appended and
 * their text set by either player.
 */
function authorizeGameRounds(
  stored: GameRound[] | undefined,
  proposed: GameRound[],
  callerId: string
): { ok: true; gameRounds: GameRound[] } | { ok: false; reason: string } {
  const storedRounds = stored ?? [];

  // Rounds are append-only. Both storage backends replace `gameRounds`
  // wholesale, so a shorter array deletes the omitted tail — which is every
  // answer in it, including the partner's. Refusing truncation is the only
  // thing standing between a participant and `gameRounds: []`.
  if (proposed.length < storedRounds.length) {
    return { ok: false, reason: 'Cannot remove game rounds' };
  }

  const reconciled: GameRound[] = [];

  for (const [index, proposedRound] of proposed.entries()) {
    const storedRound = storedRounds[index];

    // A brand new round can only carry the caller's own answer.
    if (!storedRound) {
      const foreign = Object.keys(proposedRound.answers ?? {}).filter((id) => id !== callerId);
      if (foreign.length > 0) {
        return { ok: false, reason: "Cannot submit another player's answer" };
      }
      reconciled.push(proposedRound);
      continue;
    }

    // The question a round asks is fixed once the round exists. Otherwise a
    // caller could echo the partner's answer unchanged while swapping the
    // question out from under it — forging what that answer *means* to the UI
    // and to both AI flows, without altering a character of the answer itself.
    if (proposedRound.question !== storedRound.question) {
      return { ok: false, reason: 'Cannot change the question on an existing round' };
    }

    const storedAnswers = storedRound.answers ?? {};
    const proposedAnswers = proposedRound.answers ?? {};
    const answers: Record<string, string> = { ...storedAnswers };

    for (const [playerId, answer] of Object.entries(proposedAnswers)) {
      if (playerId === callerId) {
        answers[playerId] = answer;
        continue;
      }
      // Echoing back an unchanged answer is what every read-modify-write does;
      // only a *different* value is an attempt to write someone else's.
      if (storedAnswers[playerId] !== answer) {
        return { ok: false, reason: "Cannot submit another player's answer" };
      }
    }

    // No check for an omitted partner key: `answers` starts from storage, so
    // omission preserves rather than deletes. Refusing it would 403 an honest
    // client that simply polled before the partner's answer landed.
    reconciled.push({ question: storedRound.question, answers });
  }

  return { ok: true, gameRounds: reconciled };
}

/**
 * Authorize a game update for a caller who is already known to be a participant.
 *
 * Returns the updates that should actually be persisted — which may differ from
 * what was proposed, since another player's fields are taken from storage rather
 * than trusted from the request.
 *
 * Fields not named here are shared game progression (step, commonCategories,
 * finalSpicyLevel, chaosMode, currentQuestion, summary, visual memories) and
 * either player may set them; that matches how the game actually advances.
 */
export function authorizeGameUpdate(
  game: GameState,
  callerId: string,
  updates: Partial<GameState>
): AuthorizationResult {
  const authorized: Partial<GameState> = { ...updates };

  // hostId is assigned at creation and is not a thing an update may reassign.
  if (updates.hostId !== undefined && updates.hostId !== game.hostId) {
    return { ok: false, reason: 'Host cannot be reassigned' };
  }
  delete authorized.hostId;

  // playerIds is the read-access list: GET /api/game/[roomCode] admits anyone
  // it contains. Both storage backends *union* it on update rather than
  // replacing it, so a proposed id can only ever be added — meaning an update
  // could hand a stranger read access to both partners' answers. Membership is
  // maintained by create and join; an update never changes it.
  if (updates.playerIds !== undefined) {
    const proposed = new Set(updates.playerIds);
    const known = new Set(game.playerIds);
    const added = [...proposed].filter((id) => !known.has(id));
    if (added.length > 0) {
      return { ok: false, reason: 'Game membership cannot be changed by a game update' };
    }
  }
  delete authorized.playerIds;

  // gameMode decides which storage a client writes through: use-game-session
  // routes every write to localGame.update when it reads 'local'. Flipping a
  // server-backed room to local points every client at a localStorage entry
  // that does not exist, and the session stops accepting writes entirely.
  // currentPlayerIndex is local-mode turn tracking and has no meaning online.
  // Neither is ever sent by a client; both are set at creation.
  if (updates.gameMode !== undefined && updates.gameMode !== game.gameMode) {
    return { ok: false, reason: 'Game mode cannot be changed' };
  }
  delete authorized.gameMode;
  delete authorized.currentPlayerIndex;

  if (updates.players !== undefined) {
    const result = authorizePlayers(game.players, updates.players, callerId);
    if (!result.ok) return result;
    authorized.players = result.players;
  }

  if (updates.gameRounds !== undefined) {
    const result = authorizeGameRounds(game.gameRounds, updates.gameRounds, callerId);
    if (!result.ok) return result;
    authorized.gameRounds = result.gameRounds;
  }

  return { ok: true, updates: authorized };
}
