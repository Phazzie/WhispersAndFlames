import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { roomCode } = params;

		// TODO: Implement with game service
		console.log('Fetching game', roomCode);

		return json({
			success: true,
			game: {
				roomCode,
				hostId: 'host-123',
				players: [{ id: 'host-123', name: 'Host', isReady: false, selectedCategories: [] }],
				step: 'lobby',
				commonCategories: [],
				finalSpicyLevel: 'Mild',
				chaosMode: false,
				questions: [],
				answers: {},
				currentQuestionIndex: 0,
				summary: null,
				therapistNotes: null,
				visualMemory: null,
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
			}
		});
	} catch (error) {
		return json({ success: false, error: 'Game not found' }, { status: 404 });
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const { roomCode } = params;
		const updates = await request.json();

		// TODO: Implement with game service
		console.log('Updating game', roomCode, updates);

		return json({ success: true });
	} catch (error) {
		return json({ success: false, error: 'Failed to update game' }, { status: 500 });
	}
};
