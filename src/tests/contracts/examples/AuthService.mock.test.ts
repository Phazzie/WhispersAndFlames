/**
 * Example: Running AuthService contract tests against mock auth implementation
 *
 * This demonstrates how to create and test a mock authentication service.
 */

import { describe, beforeEach } from 'vitest';
import { runAuthServiceContractTests, type AuthService, type AuthUser } from '../AuthService.contract.test';

/**
 * Mock Authentication Service Implementation
 * Provides in-memory user management for testing
 */
class MockAuthService implements AuthService {
  private users = new Map<string, { id: string; email: string; name: string | null; passwordHash: string; createdAt: Date }>();
  private sessions = new Map<string, { userId: string; expiresAt: Date }>();
  private currentUserId: string | null = null;

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.currentUserId) return null;

    const user = Array.from(this.users.values()).find((u) => u.id === this.currentUserId);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    await this.delay(100);

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = Array.from(this.users.values()).find((u) => u.email === email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Simple password check (in real implementation, use bcrypt)
    const passwordHash = this.hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      throw new Error('Invalid credentials');
    }

    this.currentUserId = user.id;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  async signUp(email: string, password: string, name: string): Promise<AuthUser> {
    await this.delay(150);

    // Validation
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check for duplicate email
    const existingUser = Array.from(this.users.values()).find((u) => u.email === email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Create user
    const id = crypto.randomUUID();
    const user = {
      id,
      email,
      name: name || null,
      passwordHash: this.hashPassword(password),
      createdAt: new Date(),
    };

    this.users.set(id, user);
    this.currentUserId = id;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  async signOut(): Promise<void> {
    await this.delay(50);
    this.currentUserId = null;
  }

  async validateSession(token: string): Promise<string | null> {
    await this.delay(50);

    const session = this.sessions.get(token);
    if (!session) return null;

    if (session.expiresAt < new Date()) {
      this.sessions.delete(token);
      return null;
    }

    return session.userId;
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    await this.delay(50);

    const user = this.users.get(userId);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  async updateUser(userId: string, updates: { name?: string; email?: string }): Promise<AuthUser> {
    await this.delay(100);

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate email if updating
    if (updates.email && !this.isValidEmail(updates.email)) {
      throw new Error('Invalid email format');
    }

    // Check for duplicate email
    if (updates.email && updates.email !== user.email) {
      const existingUser = Array.from(this.users.values()).find(
        (u) => u.email === updates.email && u.id !== userId
      );
      if (existingUser) {
        throw new Error('Email already exists');
      }
    }

    // Update user
    if (updates.name !== undefined) user.name = updates.name;
    if (updates.email !== undefined) user.email = updates.email;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  async deleteUser(userId: string): Promise<void> {
    await this.delay(100);

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    this.users.delete(userId);

    // Sign out if deleting current user
    if (this.currentUserId === userId) {
      this.currentUserId = null;
    }

    // Delete all sessions for this user
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }
  }

  private hashPassword(password: string): string {
    // Simple hash for testing (use bcrypt in production)
    return `hashed_${password}`;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Test helper: Reset state between tests
  reset(): void {
    this.users.clear();
    this.sessions.clear();
    this.currentUserId = null;
  }
}

describe('AuthService Contract - Mock Auth Implementation', () => {
  const mockService = new MockAuthService();

  beforeEach(() => {
    // Reset state between tests
    mockService.reset();
  });

  // Run all contract tests against the mock implementation
  runAuthServiceContractTests(mockService);

  // You can add mock-specific tests here if needed
  describe('Mock Auth Specific Tests', () => {
    // Example: Test in-memory storage behavior
    // Example: Test password hashing
  });
});
