import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const input = await request.json();

		// TODO: Implement with AI service
		console.log('Generating question', input);

		return json({
			success: true,
			question: "What's one completely non-sexual thing your partner does that somehow makes you think sexual thoughts?"
		});
	} catch (error) {
		return json({ success: false, error: 'Failed to generate question' }, { status: 500 });
	}
};
