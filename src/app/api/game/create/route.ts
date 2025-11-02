import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import type { GameState } from '@/lib/game-types';
import { storage } from '@/lib/storage-adapter';
import { checkRateLimit, getClientIp } from '@/lib/utils/security';

const createGameSchema = z.object({
  roomCode: z.string().min(4),
  playerName: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // Rate limiting: 10 game creations per minute per IP
    const clientIp = getClientIp(request);
    if (!checkRateLimit(`game-create:${clientIp}`, 10, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await auth.getCurrentUser(session.value);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, playerName } = createGameSchema.parse(body);

    // Check if room already exists
    const existing = await storage.games.get(roomCode);
    if (existing) {
      return NextResponse.json({ error: 'Room code already in use' }, { status: 400 });
    }

    // Create initial game state
    const initialState: GameState = {
      step: 'lobby',
      players: [
        {
          id: user.id,
          name: playerName,
          email: user.email,
          isReady: false,
          selectedCategories: [],
        },
      ],
      playerIds: [user.id],
      hostId: user.id,
      commonCategories: [],
      finalSpicyLevel: 'Mild',
      chaosMode: false,
      gameRounds: [],
      currentQuestion: '',
      currentQuestionIndex: 0,
      totalQuestions: 0,
      summary: '',
      visualMemories: [],
      imageGenerationCount: 0,
      roomCode,
    };

    const game = await storage.games.create(roomCode, initialState);

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
