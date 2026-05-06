import { NextRequest, NextResponse } from 'next/server';
import { getLegalMoves } from '@/engine/chess-engine';
import { gameManager } from '@/manager/game-manager';

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
  const { gameId } = await params;
  const from = req.nextUrl.searchParams.get('from');

  if (!isSquare(from)) {
    return NextResponse.json(
      { gameId, error: 'invalid_square', moves: [] },
      { status: 400 },
    );
  }

  try {
    const state = gameManager.getGame(gameId);
    return NextResponse.json({
      gameId,
      from,
      moves: getLegalMoves(state.fen, from),
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return NextResponse.json(
        { gameId, error: 'game_not_found', moves: [] },
        { status: 404 },
      );
    }

    console.error('[legal-moves] failed to read legal moves:', gameId, err);
    return NextResponse.json(
      { gameId, error: 'legal_moves_failed', moves: [] },
      { status: 500 },
    );
  }
}
