import { NextRequest, NextResponse } from 'next/server';
import { getActiveGameAccess } from '@/lib/active-game-access';
import { getCurrentSession } from '@/lib/session';

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
 * - `200`: `{ gameId: string, state: GameState }` for games still waiting
 *   for a second player.
 *
 * Error JSON responses:
 * - `404`: `{ gameId: string, error: 'game_not_found' }`
 * - `409`: `{ gameId: string, error: 'game_already_started' }`
 * - `500`: `{ gameId: string, error: 'game_read_failed' }`
 *
 * @returns A `Promise<NextResponse>` from `GET` containing the game state or a
 * JSON error response. Errors thrown while reading the game are caught and
 * normalized into the documented error payloads.
 */
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to join a game.' },
      { status: 401 },
    );
  }

  const { gameId } = await params;
  const inviteToken = req.nextUrl.searchParams.get('invite');

  try {
    const access = await getActiveGameAccess({
      gameId,
      userId: session.user.id,
      inviteToken,
    });

    if (!access.ok) {
      if (access.reason === 'not_found') {
        return NextResponse.json(
          { gameId, error: 'game_not_found' },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { gameId, error: 'forbidden', message: 'Use a valid invite link to join this game.' },
        { status: 403 },
      );
    }

    return NextResponse.json({ gameId, state: access.state, playerId: session.user.id });
  } catch (err) {
    console.error('[game] failed to read game:', gameId, err);
    return NextResponse.json({ gameId, error: 'game_read_failed' }, { status: 500 });
  }
}
