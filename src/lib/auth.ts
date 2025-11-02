/**
 * Authentication utilities for session management
 * Supports both PostgreSQL and in-memory storage
 */

import { storage } from './storage-adapter';

// Secure password hashing using PBKDF2 with salt
async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Convert password to key material
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey('raw', passwordData, 'PBKDF2', false, [
    'deriveBits',
  ]);

  // Derive key using PBKDF2 with 100,000 iterations
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  // Combine salt and hash
  const hashArray = new Uint8Array(hashBuffer);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  // Convert to hex string
  return Array.from(combined)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Convert stored hash from hex to bytes
    const combined = new Uint8Array(
      storedHash.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    if (combined.length < 16) {
      return false; // Invalid hash format
    }

    // Extract salt and hash
    const salt = combined.slice(0, 16);
    const hash = combined.slice(16);

    // Hash the provided password with the same salt
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey('raw', passwordData, 'PBKDF2', false, [
      'deriveBits',
    ]);

    const newHashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const newHash = new Uint8Array(newHashBuffer);

    // Constant-time comparison
    if (newHash.length !== hash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < newHash.length; i++) {
      result |= newHash[i] ^ hash[i];
    }

    return result === 0;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

export const auth = {
  signUp: async (email: string, password: string): Promise<{ userId: string; token: string }> => {
    // Check if user exists
    const existing = await storage.users.findByEmail(email);
    if (existing) {
      throw new Error('User already exists');
    }

    // Validate email with proper regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Invalid email address');
    }

    // Validate password strength
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new Error('Password must contain uppercase, lowercase, and numbers');
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
