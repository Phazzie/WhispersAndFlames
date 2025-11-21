import { writable } from 'svelte/store';
import type { GameSeam } from '$contracts/Game';

export const currentGame = writable<GameSeam | null>(null);
export const isLoading = writable<boolean>(false);
export const error = writable<string | null>(null);

export function resetGameStore() {
	currentGame.set(null);
	isLoading.set(false);
	error.set(null);
}
