import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Mock SvelteKit modules
vi.mock('$app/environment', () => ({
	browser: false,
	dev: true,
	building: false,
	version: '1.0.0'
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn(),
	beforeNavigate: vi.fn(),
	afterNavigate: vi.fn()
}));

vi.mock('$app/stores', () => {
	const getStores = () => {
		const navigating = { subscribe: vi.fn() };
		const page = { subscribe: vi.fn() };
		const session = { subscribe: vi.fn() };
		const updated = { subscribe: vi.fn(), check: vi.fn() };

		return { navigating, page, session, updated };
	};

	const page = { subscribe: vi.fn() };
	const navigating = { subscribe: vi.fn() };
	const updated = { subscribe: vi.fn(), check: vi.fn() };

	return { getStores, navigating, page, updated };
});
