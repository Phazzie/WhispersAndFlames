import { CATEGORIES, SPICY_LEVELS, ROOM_CODE_LENGTH } from './constants';
import type { Category, SpicyLevel } from '$contracts/Game';

export function validateRoomCode(roomCode: string): boolean {
	return (
		typeof roomCode === 'string' &&
		roomCode.length === ROOM_CODE_LENGTH &&
		/^[A-Z0-9]+$/.test(roomCode)
	);
}

export function validatePlayerName(name: string): boolean {
	return typeof name === 'string' && name.trim().length > 0 && name.length <= 50;
}

export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function validateCategory(category: string): category is Category {
	return CATEGORIES.includes(category as Category);
}

export function validateSpicyLevel(level: string): level is SpicyLevel {
	return SPICY_LEVELS.includes(level as SpicyLevel);
}

export function generateRoomCode(): string {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

export function sanitizeHtml(text: string): string {
	return text.replace(/[<>]/g, '');
}
