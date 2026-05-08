import { NextResponse } from 'next/server';
import { getOwnedGameHistoryDetail } from '@/lib/game-history';
import { getCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

export async function GET(
  _req: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to view game history.' },
      { status: 401 },
    );
  }

  const { gameId } = await params;
  const game = await getOwnedGameHistoryDetail(gameId, session.user.id);

  if (!game) {
    return NextResponse.json(
      { gameId, error: 'game_history_not_found' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    game: {
      id: game.id,
      userId: game.userId,
      whitePlayerId: game.whitePlayerId,
      blackPlayerId: game.blackPlayerId,
      mode: game.mode,
      status: game.status,
      result: game.result,
      resultReason: game.resultReason,
      initialFen: game.initialFen,
      finalFen: game.finalFen,
      events: game.events,
      pgn: game.pgn,
      startedAt: game.startedAt.toISOString(),
      endedAt: game.endedAt.toISOString(),
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
      lastSeq: game.lastSeq,
      plyCount: game.plyCount,
      openingName: game.openingName,
      openingEco: game.openingEco,
    },
  });
}

