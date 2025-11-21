/**
 * Auth Mock Service
 * Production-quality mock implementation of IAuthService
 * Simple in-memory user storage for development
 */

import type { IAuthService, UserSeam } from '@/contracts/Auth';

// Utility function for realistic network delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface StoredUser {
  id: string;
  email: string;
  password: string; // In mock only - never store plain passwords in real service!
  name: string | null;
  createdAt: Date;
}

export class AuthMockService implements IAuthService {
  private users: Map<string, StoredUser> = new Map();
  private currentUser: UserSeam | null = null;

  constructor() {
    // Seed with demo users for development
    this.seedDemoUsers();
  }

  private seedDemoUsers(): void {
    const demoUsers: StoredUser[] = [
      {
        id: 'user-demo-1',
        email: 'alice@example.com',
        password: 'password123',
        name: 'Alice',
        createdAt: new Date(),
      },
      {
        id: 'user-demo-2',
        email: 'bob@example.com',
        password: 'password123',
        name: 'Bob',
        createdAt: new Date(),
      },
      {
        id: 'user-demo-3',
        email: 'charlie@example.com',
        password: 'password123',
        name: 'Charlie',
        createdAt: new Date(),
      },
    ];

    demoUsers.forEach((user) => {
      this.users.set(user.email, user);
    });
  }

  async getCurrentUser(): Promise<UserSeam | null> {
    // Simulate network delay
    await delay(100);

    return this.currentUser ? structuredClone(this.currentUser) : null;
  }

  async signIn(input: { email: string; password: string }): Promise<UserSeam> {
    // Simulate network delay
    await delay(200);

    const { email, password } = input;

    // Validate inputs
    if (!email?.trim()) {
      throw new Error('Email is required');
    }

    if (!password?.trim()) {
      throw new Error('Password is required');
    }

    // Find user
    const normalizedEmail = email.toLowerCase().trim();
    const storedUser = this.users.get(normalizedEmail);

    if (!storedUser) {
      throw new Error('Invalid email or password');
    }

    // Verify password (in mock only - real service uses proper hashing)
    if (storedUser.password !== password) {
      throw new Error('Invalid email or password');
    }

    // Create user session
    const user: UserSeam = {
      id: storedUser.id,
      email: storedUser.email,
      name: storedUser.name,
      createdAt: storedUser.createdAt,
    };

    this.currentUser = user;

    return structuredClone(user);
  }

  async signUp(input: {
    email: string;
    password: string;
    name: string;
  }): Promise<UserSeam> {
    // Simulate network delay
    await delay(250);

    const { email, password, name } = input;

    // Validate inputs
    if (!email?.trim()) {
      throw new Error('Email is required');
    }

    if (!password?.trim()) {
      throw new Error('Password is required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!name?.trim()) {
      throw new Error('Name is required');
    }

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    if (this.users.has(normalizedEmail)) {
      throw new Error('User already exists');
    }

    // Create new user
    const newUser: StoredUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      email: normalizedEmail,
      password: password, // Mock only - never do this in production!
      name: name.trim(),
      createdAt: new Date(),
    };

    this.users.set(normalizedEmail, newUser);

    // Create user session
    const user: UserSeam = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      createdAt: newUser.createdAt,
    };

    this.currentUser = user;

    return structuredClone(user);
  }

  async signOut(): Promise<void> {
    // Simulate network delay
    await delay(100);

    this.currentUser = null;
  }
}
