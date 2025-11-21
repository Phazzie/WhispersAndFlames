import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { roomCode, playerId, playerName } = await request.json();

		// TODO: Implement with game service
		console.log('Joining game', roomCode, playerId, playerName);

		return json({
			success: true,
			game: {
				roomCode,
				hostId: 'host-123',
				players: [
					{ id: 'host-123', name: 'Host', isReady: false, selectedCategories: [] },
					{ id: playerId, name: playerName, isReady: false, selectedCategories: [] }
				],
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
		return json({ success: false, error: 'Failed to join game' }, { status: 500 });
	}
};
