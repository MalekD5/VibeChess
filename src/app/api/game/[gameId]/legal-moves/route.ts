import { NextRequest, NextResponse } from 'next/server';
import { getLegalMoves } from '@/engine/chess-engine';
import { getActiveGameAccess } from '@/lib/active-game-access';
import { getCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

function isSquare(value: string | null): value is string {
  return value !== null && /^[a-h][1-8]$/.test(value);
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to view legal moves.', moves: [] },
      { status: 401 },
    );
  }

  const { gameId } = await params;
  const from = req.nextUrl.searchParams.get('from');
  const inviteToken = req.headers.get('x-invite-token');

  if (!isSquare(from)) {
    return NextResponse.json(
      { gameId, error: 'invalid_square', moves: [] },
      { status: 400 },
    );
  }

  try {
    const access = await getActiveGameAccess({
      gameId,
      userId: session.user.id,
      inviteToken,
    });

    if (!access.ok) {
      if (access.reason === 'not_found') {
        return NextResponse.json(
          { gameId, error: 'game_not_found', moves: [] },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { gameId, error: 'forbidden', moves: [] },
        { status: 403 },
      );
    }

    return NextResponse.json({
      gameId,
      from,
      moves: getLegalMoves(access.state.fen, from),
    });
  } catch (err) {
    console.error('[legal-moves] failed to read legal moves:', gameId, err);
    return NextResponse.json(
      { gameId, error: 'legal_moves_failed', moves: [] },
      { status: 500 },
    );
  }
}
