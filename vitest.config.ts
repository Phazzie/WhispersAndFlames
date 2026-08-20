import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // '.claude/**' holds Claude Code agent worktrees: full repo copies whose
    // test files would otherwise be collected alongside the real suite.
    exclude: ['node_modules', 'e2e/**', '.next/**', 'dist/**', '.claude/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'e2e/**',
        '.next/**',
        'dist/**',
        '.claude/**',
        '**/*.config.*',
        '**/types.ts',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
