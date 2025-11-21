/**
 * Example: Running GameService contract tests against in-memory storage
 *
 * This demonstrates how to use the contract test suite to validate
 * the in-memory storage implementation.
 */

import { describe } from 'vitest';
import { storage } from '@/lib/storage-memory';
import { runGameServiceContractTests } from '../GameService.contract.test';

describe('GameService Contract - In-Memory Storage Implementation', () => {
  // Run all contract tests against the in-memory implementation
  runGameServiceContractTests(storage);

  // You can add implementation-specific tests here if needed
  describe('In-Memory Specific Tests', () => {
    // These are optional - only add if you need to test
    // memory-specific behavior that's not part of the contract

    // Example: Test that data persists in memory during the session
    // Example: Test that cleanup happens on probabilistic basis
  });
});
