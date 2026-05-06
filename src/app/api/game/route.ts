import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ablyGameAdapter } from '@/adapters/ably-game-adapter';
import { gameManager } from '@/manager/game-manager';

export const runtime = 'nodejs';

/**
 * POST creates a new game session without reading a request body.
 *
 * The handler first calls `gameManager.createGame` to create the in-memory game
 * state, then calls `ablyGameAdapter.subscribe` so the server can process
 * realtime events for the new game channel. If subscription fails after game
 * creation, `gameManager.deleteGame` runs as best-effort cleanup before the
 * subscription error response is returned.
 *
 * @returns A `200` JSON response shaped as
 * `{ gameId: string, channelName: string, state: object }` when game creation
 * and Ably subscription both succeed.
 *
 * Example success:
 * `{ "gameId": "uuid", "channelName": "game:uuid", "state": {} }`
 *
 * @throws Does not rethrow failures; errors are converted to JSON responses.
 * @errors `500` with `{ "error": "game_creation_failed" }` when
 * `gameManager.createGame` fails before a game exists.
 * @errors `500` with `{ "error": "subscription_failed" }` when
 * `ablyGameAdapter.subscribe` fails after creation. If the failure message
 * includes `ABLY_API_KEY`, the response includes the optional `message` field:
 * `{ "error": "subscription_failed", "message": "ABLY_API_KEY ..." }`.
 */
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
