/**
 * AI Service Contract
 *
 * This file defines the complete contract for the AI service following Seam-Driven Development.
 * Covers question generation, summaries, therapist notes, and visual memory creation.
 *
 * All implementations (mock and real) must conform to these interfaces.
 *
 * @module contracts/AI
 */

import { z } from 'zod';
import type { Category, SpicyLevel } from './Game';
import { categorySchema, spicyLevelSchema } from './Game';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Safety level for visual memory prompts
 */
export type SafetyLevel = 'safe' | 'moderate';

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const safetyLevelSchema = z.enum(['safe', 'moderate']);

export const questionInputSchema = z.object({
  categories: z.array(categorySchema).min(1),
  spicyLevel: spicyLevelSchema,
  previousQuestions: z.array(z.string()),
  playerCount: z.number().int().min(2).max(3),
});

export const questionOutputSchema = z.object({
  question: z.string().min(10),
});

export const summaryInputSchema = z.object({
  questions: z.array(z.string()).min(1),
  answers: z.array(z.string()).min(1),
  categories: z.array(categorySchema).min(1),
  spicyLevel: spicyLevelSchema,
  playerCount: z.number().int().min(2).max(3),
});

export const summaryOutputSchema = z.object({
  summary: z.string().min(100),
});

export const therapistNotesInputSchema = z.object({
  questions: z.array(z.string()).min(1),
  answers: z.array(z.string()).min(1),
  categories: z.array(categorySchema).min(1),
  spicyLevel: spicyLevelSchema,
  playerCount: z.number().int().min(2).max(3),
});

export const therapistNotesOutputSchema = z.object({
  notes: z.string().min(100),
});

export const visualMemoryInputSchema = z.object({
  summary: z.string().min(50),
  spicyLevel: spicyLevelSchema,
  sharedThemes: z.array(z.string()).min(1),
});

export const visualMemorySeamSchema = z.object({
  imagePrompt: z.string().min(50).max(200),
  safetyLevel: safetyLevelSchema,
});

// ============================================================================
// Interface Definitions (The "Seams")
// ============================================================================

/**
 * Input for generating a contextual question
 */
export interface QuestionInput {
  /** Selected categories for the session */
  categories: Category[];

  /** Current spicy level intensity */
  spicyLevel: SpicyLevel;

  /** Previously asked questions (to avoid repetition) */
  previousQuestions: string[];

  /** Number of players (2 for couples, 3 for triads) */
  playerCount: number;
}

/**
 * Output from question generation
 */
export interface QuestionOutput {
  /** The generated question following Ember's voice and patterns */
  question: string;
}

/**
 * Input for generating session summary (The Scribe)
 */
export interface SummaryInput {
  /** All questions asked during the session */
  questions: string[];

  /** All answers provided (flat array of all player answers) */
  answers: string[];

  /** Categories explored */
  categories: Category[];

  /** Spicy level used */
  spicyLevel: SpicyLevel;

  /** Number of players */
  playerCount: number;
}

/**
 * Output from summary generation
 */
export interface SummaryOutput {
  /** Warm, insightful summary identifying themes and suggestions */
  summary: string;
}

/**
 * Input for generating therapist notes (Dr. Ember)
 */
export interface TherapistNotesInput {
  /** All questions asked during the session */
  questions: string[];

  /** All answers provided (flat array of all player answers) */
  answers: string[];

  /** Categories explored */
  categories: Category[];

  /** Spicy level used */
  spicyLevel: SpicyLevel;

  /** Number of players */
  playerCount: number;
}

/**
 * Output from therapist notes generation
 */
export interface TherapistNotesOutput {
  /** Clinical-style observations with playful personality */
  notes: string;
}

/**
 * Input for generating visual memory prompt
 */
export interface VisualMemoryInput {
  /** The session summary to base the image on */
  summary: string;

  /** Spicy level (affects emotional temperature) */
  spicyLevel: SpicyLevel;

  /** Key themes identified in the session */
  sharedThemes: string[];
}

/**
 * Output from visual memory generation
 */
export interface VisualMemorySeam {
  /** Abstract art prompt (safe for AI image generation) */
  imagePrompt: string;

  /** Safety level rating (never 'explicit') */
  safetyLevel: SafetyLevel;
}

// ============================================================================
// Service Interface (The Primary Seam)
// ============================================================================

/**
 * AI Service Interface
 *
 * This interface defines all AI-powered operations in the application.
 * Both mock and real implementations must implement this interface
 * and pass the same contract tests.
 *
 * @interface IAIService
 */
export interface IAIService {
  /**
   * Generates a contextual question following Ember's personality and patterns
   *
   * Questions must:
   * - Be about THEIR partner(s), not hypotheticals
   * - Match the spicy level intensity
   * - Use one of the 10 question patterns (see AIGUIDA)
   * - Force specificity ("exactly", "one specific")
   * - Avoid repetition from previousQuestions
   *
   * @param input - Question generation parameters
   * @returns Promise resolving to generated question
   * @throws Error if generation fails or rate limit exceeded
   *
   * @example
   * ```typescript
   * const output = await aiService.generateQuestion({
   *   categories: ['Power Play', 'Hidden Attractions'],
   *   spicyLevel: 'Medium',
   *   previousQuestions: [],
   *   playerCount: 2
   * });
   * console.log(output.question);
   * // "What's one instruction you'd love to give your partner that starts with 'Don't move while I...'?"
   * ```
   */
  generateQuestion(input: QuestionInput): Promise<QuestionOutput>;

  /**
   * Generates a warm, insightful summary of the session (The Scribe)
   *
   * Summary should:
   * - Identify shared themes and patterns
   * - Celebrate vulnerability and connection
   * - Suggest "next adventures"
   * - Use friend-like, warm tone
   * - Be 2-4 paragraphs
   *
   * @param input - Summary generation parameters
   * @returns Promise resolving to generated summary
   * @throws Error if generation fails
   *
   * @example
   * ```typescript
   * const output = await aiService.generateSummary({
   *   questions: ['Q1', 'Q2', 'Q3'],
   *   answers: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
   *   categories: ['Power Play', 'Emotional Depths'],
   *   spicyLevel: 'Medium',
   *   playerCount: 2
   * });
   * console.log(output.summary);
   * ```
   */
  generateSummary(input: SummaryInput): Promise<SummaryOutput>;

  /**
   * Generates clinical-style therapist notes with personality (Dr. Ember)
   *
   * Notes should include:
   * - Session overview
   * - Key observations
   * - Clinical impressions
   * - Playful recommendations
   * - Professional language used playfully
   *
   * @param input - Therapist notes generation parameters
   * @returns Promise resolving to generated notes
   * @throws Error if generation fails
   *
   * @example
   * ```typescript
   * const output = await aiService.generateTherapistNotes({
   *   questions: ['Q1', 'Q2'],
   *   answers: ['A1', 'A2', 'A3', 'A4'],
   *   categories: ['Sensory Exploration'],
   *   spicyLevel: 'Hot',
   *   playerCount: 2
   * });
   * console.log(output.notes);
   * ```
   */
  generateTherapistNotes(input: TherapistNotesInput): Promise<TherapistNotesOutput>;

  /**
   * Generates an abstract visual memory prompt
   *
   * Prompt must:
   * - Be metaphorical/abstract (never explicit)
   * - Match spicy level's emotional temperature
   * - Be safe for AI image generation
   * - Be 50-200 characters
   * - Never use explicit imagery
   *
   * @param input - Visual memory generation parameters
   * @returns Promise resolving to image prompt and safety level
   * @throws Error if generation fails
   *
   * @example
   * ```typescript
   * const output = await aiService.generateVisualMemory({
   *   summary: 'Session explored anticipation and control dynamics',
   *   spicyLevel: 'Medium',
   *   sharedThemes: ['anticipation', 'control', 'trust']
   * });
   * console.log(output.imagePrompt);
   * // "Impressionist oil painting of two flames dancing together, warm oranges..."
   * console.log(output.safetyLevel); // "moderate"
   * ```
   */
  generateVisualMemory(input: VisualMemoryInput): Promise<VisualMemorySeam>;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates QuestionInput from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated QuestionInput object
 * @throws ZodError if validation fails
 */
export function validateQuestionInput(data: unknown): QuestionInput {
  return questionInputSchema.parse(data);
}

/**
 * Validates QuestionOutput from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated QuestionOutput object
 * @throws ZodError if validation fails
 */
export function validateQuestionOutput(data: unknown): QuestionOutput {
  return questionOutputSchema.parse(data);
}

/**
 * Validates SummaryInput from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated SummaryInput object
 * @throws ZodError if validation fails
 */
export function validateSummaryInput(data: unknown): SummaryInput {
  return summaryInputSchema.parse(data);
}

/**
 * Validates SummaryOutput from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated SummaryOutput object
 * @throws ZodError if validation fails
 */
export function validateSummaryOutput(data: unknown): SummaryOutput {
  return summaryOutputSchema.parse(data);
}

/**
 * Validates TherapistNotesInput from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated TherapistNotesInput object
 * @throws ZodError if validation fails
 */
export function validateTherapistNotesInput(data: unknown): TherapistNotesInput {
  return therapistNotesInputSchema.parse(data);
}

/**
 * Validates TherapistNotesOutput from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated TherapistNotesOutput object
 * @throws ZodError if validation fails
 */
export function validateTherapistNotesOutput(data: unknown): TherapistNotesOutput {
  return therapistNotesOutputSchema.parse(data);
}

/**
 * Validates VisualMemoryInput from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated VisualMemoryInput object
 * @throws ZodError if validation fails
 */
export function validateVisualMemoryInput(data: unknown): VisualMemoryInput {
  return visualMemoryInputSchema.parse(data);
}

/**
 * Validates VisualMemorySeam from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated VisualMemorySeam object
 * @throws ZodError if validation fails
 */
export function validateVisualMemorySeam(data: unknown): VisualMemorySeam {
  return visualMemorySeamSchema.parse(data);
}

/**
 * Type guard to check if a value is a valid SafetyLevel
 */
export function isSafetyLevel(value: unknown): value is SafetyLevel {
  return safetyLevelSchema.safeParse(value).success;
}
