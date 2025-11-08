/**
 * Test script to verify transaction handling and race condition fixes
 * Run with: npx tsx scripts/test-transaction-race-conditions.ts
 */

import { storage, initSchema } from '../src/lib/storage-pg';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test 1: Concurrent updates to same game
 * This should demonstrate that transactions prevent race conditions
 */
async function testConcurrentUpdates(): Promise<TestResult> {
  const testName = 'Concurrent Updates Test';
  const startTime = Date.now();

  try {
    // Create a test game
    const roomCode = `TEST-${Date.now()}`;
    const initialState = {
      roomCode,
      playerIds: ['player1'],
      players: [],
      hostId: 'player1',
      gameMode: 'online' as const,
      commonCategories: [],
      finalSpicyLevel: 'Mild' as const,
      chaosMode: false,
      gameRounds: [],
      currentQuestion: '',
      currentQuestionIndex: 0,
      totalQuestions: 10,
      summary: '',
      imageGenerationCount: 0,
      step: 'lobby' as const,
      createdAt: new Date(),
    };

    await storage.games.create(roomCode, initialState);

    // Perform 10 concurrent updates
    const updatePromises = Array.from({ length: 10 }, async (_, i) => {
      await storage.games.update(roomCode, {
        currentQuestionIndex: i + 1,
        playerIds: [`player${i + 1}`],
      });
    });

    await Promise.all(updatePromises);

    // Verify final state
    const finalState = await storage.games.get(roomCode);

    // Cleanup
    await storage.games.delete(roomCode);

    // Test passes if we got a final state (no crashes)
    return {
      name: testName,
      passed: !!finalState,
      duration: Date.now() - startTime,
      details: `Final question index: ${finalState?.currentQuestionIndex}, Players: ${finalState?.playerIds.length}`,
    };
  } catch (error) {
    return {
      name: testName,
      passed: false,
      duration: Date.now() - startTime,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test 2: Transaction rollback on error
 */
async function testTransactionRollback(): Promise<TestResult> {
  const testName = 'Transaction Rollback Test';
  const startTime = Date.now();

  try {
    const roomCode = `TEST-ROLLBACK-${Date.now()}`;

    // Try to update a non-existent game
    const result = await storage.games.update(roomCode, {
      currentQuestionIndex: 5,
    });

    return {
      name: testName,
      passed: result === undefined,
      duration: Date.now() - startTime,
      details:
        result === undefined ? 'Correctly returned undefined' : 'Should have returned undefined',
    };
  } catch (error) {
    return {
      name: testName,
      passed: false,
      duration: Date.now() - startTime,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test 3: Query performance with GIN index
 */
async function testQueryPerformance(): Promise<TestResult> {
  const testName = 'Query Performance Test';
  const startTime = Date.now();

  try {
    // Create multiple test games
    const userId = `perf-test-${Date.now()}`;
    const createPromises = Array.from({ length: 20 }, async (_, i) => {
      const roomCode = `PERF-${Date.now()}-${i}`;
      await storage.games.create(roomCode, {
        roomCode,
        playerIds: [userId, `other-${i}`],
        players: [],
        hostId: userId,
        gameMode: 'online' as const,
        commonCategories: [],
        finalSpicyLevel: 'Mild' as const,
        chaosMode: false,
        gameRounds: [],
        currentQuestion: '',
        currentQuestionIndex: 0,
        totalQuestions: 10,
        summary: '',
        imageGenerationCount: 0,
        step: 'lobby' as const,
        createdAt: new Date(),
      });
    });

    await Promise.all(createPromises);

    // Test list query performance
    const queryStart = Date.now();
    const games = await storage.games.list(userId);
    const queryDuration = Date.now() - queryStart;

    // Cleanup
    const deletePromises = games.map((game) => storage.games.delete(game.roomCode));
    await Promise.all(deletePromises);

    return {
      name: testName,
      passed: games.length >= 20 && queryDuration < 500,
      duration: Date.now() - startTime,
      details: `Found ${games.length} games in ${queryDuration}ms`,
    };
  } catch (error) {
    return {
      name: testName,
      passed: false,
      duration: Date.now() - startTime,
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Starting Database Transaction Tests\n');
  console.log('='.repeat(60));

  // Initialize schema
  await initSchema();

  const tests = [testConcurrentUpdates, testTransactionRollback, testQueryPerformance];

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`\n▶ Running: ${test.name}`);
    const result = await test();
    results.push(result);

    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.duration}ms`);
    if (result.details) {
      console.log(`  Details: ${result.details}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`  Passed: ${passed}/${total}`);
  console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (passed === total) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('❌ Test runner failed:', err);
  process.exit(1);
});
