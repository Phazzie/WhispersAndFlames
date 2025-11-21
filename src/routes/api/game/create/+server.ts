import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { hostId, playerName } = await request.json();

		// TODO: Implement with game service
		console.log('Creating game for', hostId, playerName);

		return json({
			success: true,
			game: {
				roomCode: 'ABC123',
				hostId,
				players: [{ id: hostId, name: playerName, isReady: false, selectedCategories: [] }],
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
		return json({ success: false, error: 'Failed to create game' }, { status: 500 });
	}
};
