import type { Category, SpicyLevel } from '$contracts/Game';

export const CATEGORIES: Category[] = [
	'Hidden Attractions',
	'Power Play',
	'Fantasy Confessions',
	'Emotional Intimacy',
	'Sensory Exploration',
	'Public/Private',
	'Roleplay & Scenarios'
];

export const SPICY_LEVELS: SpicyLevel[] = ['Mild', 'Medium', 'Hot', 'Extra-Hot'];

export const SPICY_LEVEL_DESCRIPTIONS: Record<SpicyLevel, string> = {
	Mild: 'Flirty glances, emotional intimacy, romantic tension',
	Medium: 'Sensual scenarios, specific attractions, building heat',
	Hot: 'Explicit desires, detailed fantasies, clear sexual content',
	'Extra-Hot': 'Boundary-pushing, unfiltered, intense exploration'
};

export const MAX_PLAYERS = 3;
export const GAME_EXPIRATION_HOURS = 24;
export const ROOM_CODE_LENGTH = 6;
