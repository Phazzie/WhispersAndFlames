import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	test: {
		include: ['src/tests/**/*.test.ts', 'src/**/*.test.ts'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/tests/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/tests/',
				'**/*.test.ts',
				'**/*.spec.ts',
				'**/mock/**',
				'src/app.html'
			]
		}
	},
	resolve: {
		alias: {
			$lib: '/src/lib',
			$contracts: '/src/contracts',
			$tests: '/src/tests'
		}
	}
});
