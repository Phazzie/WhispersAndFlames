/**
 * Contracts Barrel Export
 *
 * This file provides a centralized export for all contract definitions,
 * following Seam-Driven Development principles.
 *
 * Import contracts like this:
 * ```typescript
 * import { GameSeam, IGameService, IAIService } from '@/contracts';
 * ```
 *
 * Or import specific contracts:
 * ```typescript
 * import { GameSeam } from '@/contracts/Game';
 * import { QuestionInput } from '@/contracts/AI';
 * ```
 *
 * @module contracts
 */

// ============================================================================
// Game Contract Exports
// ============================================================================

export type {
  GameStep,
  SpicyLevel,
  Category,
  GameMode,
  PlayerSeam,
  GameRound,
  VisualMemory,
  GameSeam,
  CreateGameInput,
  JoinGameInput,
  UpdatePlayerInput,
  GameUpdateCallback,
  UnsubscribeFunction,
  IGameService,
} from './Game';

export {
  gameStepSchema,
  spicyLevelSchema,
  categorySchema,
  gameModeSchema,
  playerSeamSchema,
  gameRoundSchema,
  visualMemorySchema,
  gameSeamSchema,
  validateGameSeam,
  validatePlayerSeam,
  isGameStep,
  isSpicyLevel,
  isCategory,
} from './Game';

// ============================================================================
// AI Contract Exports
// ============================================================================

export type {
  SafetyLevel,
  QuestionInput,
  QuestionOutput,
  SummaryInput,
  SummaryOutput,
  TherapistNotesInput,
  TherapistNotesOutput,
  VisualMemoryInput,
  VisualMemorySeam,
  IAIService,
} from './AI';

export {
  safetyLevelSchema,
  questionInputSchema,
  questionOutputSchema,
  summaryInputSchema,
  summaryOutputSchema,
  therapistNotesInputSchema,
  therapistNotesOutputSchema,
  visualMemoryInputSchema,
  visualMemorySeamSchema,
  validateQuestionInput,
  validateQuestionOutput,
  validateSummaryInput,
  validateSummaryOutput,
  validateTherapistNotesInput,
  validateTherapistNotesOutput,
  validateVisualMemoryInput,
  validateVisualMemorySeam,
  isSafetyLevel,
} from './AI';

// ============================================================================
// Auth Contract Exports
// ============================================================================

export type {
  UserSeam,
  SignInInput,
  SignUpInput,
  IAuthService,
} from './Auth';

export {
  userSeamSchema,
  signInInputSchema,
  signUpInputSchema,
  validateUserSeam,
  validateSignInInput,
  validateSignUpInput,
  isUserSeam,
} from './Auth';
