import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// TODO: Add authentication logic
	// TODO: Add security headers
	return resolve(event);
};
