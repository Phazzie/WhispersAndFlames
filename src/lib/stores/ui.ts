import { writable } from 'svelte/store';

export const toast = writable<{
	message: string;
	type: 'success' | 'error' | 'info';
	visible: boolean;
}>({
	message: '',
	type: 'info',
	visible: false
});

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
	toast.set({ message, type, visible: true });
	setTimeout(() => {
		toast.update((t) => ({ ...t, visible: false }));
	}, 3000);
}
