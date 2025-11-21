/**
 * Service Factory
 * Switches between mock and real implementations based on environment
 */

import type { IGameService } from '@/contracts/Game';
import type { IAIService } from '@/contracts/AI';
import type { IAuthService } from '@/contracts/Auth';

import { GameMockService } from './mock/GameMock';
import { AIMockService } from './mock/AIMock';
import { AuthMockService } from './mock/AuthMock';

// Real implementations (placeholder - will be implemented in Phase 3)
// import { GameRealService } from './real/GameReal';
// import { AIRealService } from './real/AIReal';
// import { AuthRealService } from './real/AuthReal';

/**
 * Determine if mocks should be used
 * Checks environment variable USE_MOCKS
 * Defaults to true in development, false in production
 */
function shouldUseMocks(): boolean {
  // Check for explicit environment variable
  if (typeof process !== 'undefined' && process.env.USE_MOCKS !== undefined) {
    return process.env.USE_MOCKS === 'true';
  }

  // Default to mocks in development
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return true;
  }

  // Production default: use real services
  return false;
}

const USE_MOCKS = shouldUseMocks();

/**
 * Game Service Singleton
 * Returns mock or real implementation based on USE_MOCKS flag
 */
export const gameService: IGameService = USE_MOCKS
  ? new GameMockService()
  : new GameMockService(); // TODO: Replace with GameRealService in Phase 3

/**
 * AI Service Singleton
 * Returns mock or real implementation based on USE_MOCKS flag
 */
export const aiService: IAIService = USE_MOCKS
  ? new AIMockService()
  : new AIMockService(); // TODO: Replace with AIRealService in Phase 3

/**
 * Auth Service Singleton
 * Returns mock or real implementation based on USE_MOCKS flag
 */
export const authService: IAuthService = USE_MOCKS
  ? new AuthMockService()
  : new AuthMockService(); // TODO: Replace with AuthRealService in Phase 3

/**
 * Export flag for debugging/testing
 */
export const isUsingMocks = USE_MOCKS;
