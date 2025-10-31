/**
 * Authentication utilities for session management
 * Supports both PostgreSQL and in-memory storage
 */

import { storage } from './storage-adapter';

const SALT_ROUNDS = 10;

// Simple password hashing (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export const auth = {
  signUp: async (email: string, password: string): Promise<{ userId: string; token: string }> => {
    // Check if user exists
    const existing = await storage.users.findByEmail(email);
    if (existing) {
      throw new Error('User already exists');
    }

    // Validate email
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email');
    }

    // Validate password
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await storage.users.create(email, passwordHash);

    // Create session
    const token = await storage.sessions.create(user.id);

    return { userId: user.id, token };
  },

  signIn: async (email: string, password: string): Promise<{ userId: string; token: string }> => {
    const user = await storage.users.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Create session
    const token = await storage.sessions.create(user.id);

    return { userId: user.id, token };
  },

  signOut: async (token: string): Promise<void> => {
    await storage.sessions.delete(token);
  },

  validateSession: async (token: string): Promise<string | null> => {
    return await storage.sessions.validate(token);
  },

  getCurrentUser: async (token: string) => {
    const userId = await storage.sessions.validate(token);
    if (!userId) return null;

    const user = await storage.users.findById(userId);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
    };
  },
};
