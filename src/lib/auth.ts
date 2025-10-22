/**
 * Authentication utilities for in-memory session management
 */

import { storage } from './storage';

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
    const existing = storage.users.findByEmail(email);
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
    const user = storage.users.create(email, passwordHash);

    // Create session
    const token = storage.sessions.create(user.id);

    return { userId: user.id, token };
  },

  signIn: async (email: string, password: string): Promise<{ userId: string; token: string }> => {
    const user = storage.users.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Create session
    const token = storage.sessions.create(user.id);

    return { userId: user.id, token };
  },

  signOut: async (token: string): Promise<void> => {
    storage.sessions.delete(token);
  },

  validateSession: (token: string): string | null => {
    return storage.sessions.validate(token);
  },

  getCurrentUser: (token: string) => {
    const userId = storage.sessions.validate(token);
    if (!userId) return null;

    const user = storage.users.findById(userId);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
    };
  },
};
