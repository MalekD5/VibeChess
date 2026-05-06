import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ablyGameAdapter } from '@/adapters/ably-game-adapter';
import { gameManager } from '@/manager/game-manager';

export const runtime = 'nodejs';

export async function POST(): Promise<NextResponse> {
  const gameId = crypto.randomUUID();
  const channelName = `game:${gameId}` as const;
  let gameCreated = false;

  try {
    const state = await gameManager.createGame(gameId);
    gameCreated = true;
    await ablyGameAdapter.subscribe(gameId);

    return NextResponse.json({ gameId, channelName, state });
  } catch (err) {
    if (gameCreated) {
      try {
        await gameManager.deleteGame(gameId);
      } catch {
        // The caller still receives the setup failure; cleanup is best-effort.
      }
    }

    if (err instanceof Error && err.message.includes('ABLY_API_KEY')) {
      return NextResponse.json(
        { error: 'subscription_failed', message: err.message },
        { status: 500 },
      );
    }

    if (gameCreated) {
      console.error('[game] failed to subscribe game:', gameId, err);
      return NextResponse.json({ error: 'subscription_failed' }, { status: 500 });
    }

    console.error('[game] failed to create game:', gameId, err);
    return NextResponse.json({ error: 'game_creation_failed' }, { status: 500 });
  }
}
