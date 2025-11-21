/**
 * Authentication Service Contract
 *
 * This file defines the complete contract for the Authentication service
 * following Seam-Driven Development.
 *
 * All implementations (mock and real) must conform to these interfaces.
 *
 * @module contracts/Auth
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const userSeamSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export const signInInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

// ============================================================================
// Interface Definitions (The "Seams")
// ============================================================================

/**
 * Represents an authenticated user
 */
export interface UserSeam {
  /** Unique user identifier (from Clerk) */
  id: string;

  /** User's email address */
  email: string;

  /** User's display name (can be null if not set) */
  name: string | null;

  /** When the user account was created */
  createdAt: Date;
}

/**
 * Input for signing in
 */
export interface SignInInput {
  /** User's email address */
  email: string;

  /** User's password (min 8 characters) */
  password: string;
}

/**
 * Input for signing up
 */
export interface SignUpInput {
  /** User's email address */
  email: string;

  /** User's password (min 8 characters) */
  password: string;

  /** User's display name */
  name: string;
}

// ============================================================================
// Service Interface (The Primary Seam)
// ============================================================================

/**
 * Authentication Service Interface
 *
 * This interface defines all authentication operations.
 * Both mock and real implementations must implement this interface
 * and pass the same contract tests.
 *
 * @interface IAuthService
 */
export interface IAuthService {
  /**
   * Gets the currently authenticated user
   *
   * @returns Promise resolving to user or null if not authenticated
   *
   * @example
   * ```typescript
   * const user = await authService.getCurrentUser();
   * if (user) {
   *   console.log(`Logged in as ${user.email}`);
   * } else {
   *   console.log('Not logged in');
   * }
   * ```
   */
  getCurrentUser(): Promise<UserSeam | null>;

  /**
   * Signs in an existing user
   *
   * @param input - Sign in credentials
   * @returns Promise resolving to authenticated user
   * @throws Error if credentials are invalid
   *
   * @example
   * ```typescript
   * try {
   *   const user = await authService.signIn({
   *     email: 'alice@example.com',
   *     password: 'secretpassword'
   *   });
   *   console.log(`Welcome back, ${user.name}!`);
   * } catch (error) {
   *   console.error('Invalid credentials');
   * }
   * ```
   */
  signIn(input: SignInInput): Promise<UserSeam>;

  /**
   * Creates a new user account
   *
   * @param input - Sign up information
   * @returns Promise resolving to newly created user
   * @throws Error if email already exists or validation fails
   *
   * @example
   * ```typescript
   * try {
   *   const user = await authService.signUp({
   *     email: 'bob@example.com',
   *     password: 'strongpassword123',
   *     name: 'Bob'
   *   });
   *   console.log(`Account created for ${user.email}`);
   * } catch (error) {
   *   console.error('Sign up failed:', error.message);
   * }
   * ```
   */
  signUp(input: SignUpInput): Promise<UserSeam>;

  /**
   * Signs out the current user
   *
   * @returns Promise resolving when sign out is complete
   * @throws Never throws (idempotent - safe to call when not logged in)
   *
   * @example
   * ```typescript
   * await authService.signOut();
   * console.log('Logged out successfully');
   * ```
   */
  signOut(): Promise<void>;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates UserSeam from unknown source (e.g., API response)
 *
 * @param data - Unknown data to validate
 * @returns Validated UserSeam object
 * @throws ZodError if validation fails
 */
export function validateUserSeam(data: unknown): UserSeam {
  return userSeamSchema.parse(data);
}

/**
 * Validates SignInInput from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated SignInInput object
 * @throws ZodError if validation fails
 */
export function validateSignInInput(data: unknown): SignInInput {
  return signInInputSchema.parse(data);
}

/**
 * Validates SignUpInput from unknown source
 *
 * @param data - Unknown data to validate
 * @returns Validated SignUpInput object
 * @throws ZodError if validation fails
 */
export function validateSignUpInput(data: unknown): SignUpInput {
  return signUpInputSchema.parse(data);
}

/**
 * Type guard to check if an object is a valid UserSeam
 */
export function isUserSeam(value: unknown): value is UserSeam {
  return userSeamSchema.safeParse(value).success;
}
