import { NextResponse } from 'next/server';
import { gameManager } from '@/manager/game-manager';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

/**
 * GET route handler for fetching the current game state by `gameId`.
 *
 * Route signature: `GET /api/game/[gameId]`
 *
 * @param _req - Incoming request object; currently unused.
 * @param context - Route context containing path parameters.
 * @param context.params - Promise resolving to `{ gameId: string }`.
 *
 * Successful JSON response:
 * - `200`: `{ gameId: string, state: GameState }`
 *
 * Error JSON responses:
 * - `404`: `{ gameId: string, error: 'game_not_found' }`
 * - `500`: `{ gameId: string, error: 'game_read_failed' }`
 *
 * @returns A `Promise<NextResponse>` from `GET` containing the game state or a
 * JSON error response. Errors thrown while reading the game are caught and
 * normalized into the documented error payloads.
 */
export async function GET(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  const { gameId } = await params;

  try {
    const state = gameManager.getGame(gameId);
    return NextResponse.json({ gameId, state });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return NextResponse.json(
        { gameId, error: 'game_not_found' },
        { status: 404 },
      );
    }

    console.error('[game] failed to read game:', gameId, err);
    return NextResponse.json({ gameId, error: 'game_read_failed' }, { status: 500 });
  }
}
