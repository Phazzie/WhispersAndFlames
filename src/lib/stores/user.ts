import { writable } from 'svelte/store';
import type { UserSeam } from '$contracts/Auth';

export const currentUser = writable<UserSeam | null>(null);
export const isAuthenticated = writable<boolean>(false);

export function setUser(user: UserSeam | null) {
	currentUser.set(user);
	isAuthenticated.set(user !== null);
}

export function clearUser() {
	currentUser.set(null);
	isAuthenticated.set(false);
}
