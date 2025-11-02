/**
 * Tests for auth.ts - Authentication utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage-adapter';

// Mock storage
vi.mock('@/lib/storage-adapter', () => ({
  storage: {
    users: {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    },
    sessions: {
      create: vi.fn(),
      delete: vi.fn(),
      validate: vi.fn(),
    },
  },
}));

describe('Auth System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create a new user and session', async () => {
      const email = 'test@example.com';
      const password = 'Password123';
      const userId = 'user-123';
      const token = 'token-abc';

      vi.mocked(storage.users.findByEmail).mockResolvedValue(undefined);
      vi.mocked(storage.users.create).mockResolvedValue({
        id: userId,
        email,
        passwordHash: 'hash',
        createdAt: new Date(),
      });
      vi.mocked(storage.sessions.create).mockResolvedValue(token);

      const result = await auth.signUp(email, password);

      expect(result).toEqual({ userId, token });
      expect(storage.users.findByEmail).toHaveBeenCalledWith(email);
      expect(storage.users.create).toHaveBeenCalledWith(email, expect.any(String));
      expect(storage.sessions.create).toHaveBeenCalledWith(userId);
    });

    it('should reject if user already exists', async () => {
      const email = 'existing@example.com';
      const password = 'password123';

      vi.mocked(storage.users.findByEmail).mockResolvedValue({
        id: 'user-123',
        email,
        passwordHash: 'hash',
        createdAt: new Date(),
      });

      await expect(auth.signUp(email, password)).rejects.toThrow('User already exists');
    });

    it('should reject invalid email', async () => {
      vi.mocked(storage.users.findByEmail).mockResolvedValue(undefined);

      await expect(auth.signUp('invalid-email', 'password123')).rejects.toThrow('Invalid email');
      await expect(auth.signUp('', 'password123')).rejects.toThrow('Invalid email');
    });

    it('should reject weak passwords', async () => {
      vi.mocked(storage.users.findByEmail).mockResolvedValue(undefined);

      await expect(auth.signUp('test@example.com', 'short')).rejects.toThrow(
        'Password must be at least 8 characters'
      );
      await expect(auth.signUp('test@example.com', '')).rejects.toThrow(
        'Password must be at least 8 characters'
      );
      await expect(auth.signUp('test@example.com', 'password')).rejects.toThrow(
        'Password must contain uppercase, lowercase, and numbers'
      );
      await expect(auth.signUp('test@example.com', 'PASSWORD123')).rejects.toThrow(
        'Password must contain uppercase, lowercase, and numbers'
      );
    });
  });

  describe('signIn', () => {
    it('should sign in with valid credentials (integration test)', async () => {
      const email = 'test@example.com';
      const password = 'Password123';
      const userId = 'user-123';
      const token = 'token-abc';

      // First create a user to get a valid password hash
      vi.mocked(storage.users.findByEmail).mockResolvedValueOnce(undefined);
      vi.mocked(storage.users.create).mockImplementation(async (email, passwordHash) => ({
        id: userId,
        email,
        passwordHash,
        createdAt: new Date(),
      }));
      vi.mocked(storage.sessions.create).mockResolvedValue(token);

      // Sign up to create the hash
      await auth.signUp(email, password);

      // Get the hash that was created
      const createCall = vi.mocked(storage.users.create).mock.calls[0];
      const storedHash = createCall[1];

      // Now test sign in with the stored hash
      vi.mocked(storage.users.findByEmail).mockResolvedValue({
        id: userId,
        email,
        passwordHash: storedHash,
        createdAt: new Date(),
      });

      const result = await auth.signIn(email, password);

      expect(result).toEqual({ userId, token });
      expect(storage.users.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should reject non-existent user', async () => {
      vi.mocked(storage.users.findByEmail).mockResolvedValue(undefined);

      await expect(auth.signIn('nonexistent@example.com', 'password123')).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should reject invalid password', async () => {
      const email = 'test@example.com';

      vi.mocked(storage.users.findByEmail).mockResolvedValue({
        id: 'user-123',
        email,
        passwordHash: 'different-hash',
        createdAt: new Date(),
      });

      await expect(auth.signIn(email, 'WrongPassword123')).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });

  describe('signOut', () => {
    it('should delete the session', async () => {
      const token = 'token-abc';

      vi.mocked(storage.sessions.delete).mockResolvedValue(undefined);

      await auth.signOut(token);

      expect(storage.sessions.delete).toHaveBeenCalledWith(token);
    });
  });

  describe('validateSession', () => {
    it('should return userId for valid session', async () => {
      const token = 'token-abc';
      const userId = 'user-123';

      vi.mocked(storage.sessions.validate).mockResolvedValue(userId);

      const result = await auth.validateSession(token);

      expect(result).toBe(userId);
      expect(storage.sessions.validate).toHaveBeenCalledWith(token);
    });

    it('should return null for invalid session', async () => {
      const token = 'invalid-token';

      vi.mocked(storage.sessions.validate).mockResolvedValue(null);

      const result = await auth.validateSession(token);

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data for valid session', async () => {
      const token = 'token-abc';
      const userId = 'user-123';
      const email = 'test@example.com';

      vi.mocked(storage.sessions.validate).mockResolvedValue(userId);
      vi.mocked(storage.users.findById).mockResolvedValue({
        id: userId,
        email,
        passwordHash: 'hash',
        createdAt: new Date(),
      });

      const result = await auth.getCurrentUser(token);

      expect(result).toEqual({ id: userId, email });
      expect(storage.sessions.validate).toHaveBeenCalledWith(token);
      expect(storage.users.findById).toHaveBeenCalledWith(userId);
    });

    it('should return null for invalid session', async () => {
      const token = 'invalid-token';

      vi.mocked(storage.sessions.validate).mockResolvedValue(null);

      const result = await auth.getCurrentUser(token);

      expect(result).toBeNull();
      expect(storage.users.findById).not.toHaveBeenCalled();
    });

    it('should return null if user not found', async () => {
      const token = 'token-abc';
      const userId = 'user-123';

      vi.mocked(storage.sessions.validate).mockResolvedValue(userId);
      vi.mocked(storage.users.findById).mockResolvedValue(undefined);

      const result = await auth.getCurrentUser(token);

      expect(result).toBeNull();
    });
  });
});
