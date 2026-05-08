import { NextResponse } from 'next/server';
import { listGameHistoryForUser } from '@/lib/game-history';
import { getCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';

function getPlayerColor(
  game: Awaited<ReturnType<typeof listGameHistoryForUser>>[number],
  userId: string,
) {
  if (game.whitePlayerId === userId) return 'white';
  if (game.blackPlayerId === userId) return 'black';
  return null;
}

function getOpponentLabel(
  game: Awaited<ReturnType<typeof listGameHistoryForUser>>[number],
  userId: string,
) {
  const opponentId =
    game.whitePlayerId === userId ? game.blackPlayerId : game.whitePlayerId;

  if (!opponentId) return 'Unknown opponent';
  if (opponentId.startsWith('ai:')) return 'AI';
  return 'Human opponent';
}

export async function GET(): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to view game history.' },
      { status: 401 },
    );
  }

  const games = await listGameHistoryForUser(session.user.id);

  return NextResponse.json({
    games: games.map((game) => ({
      id: game.id,
      opponentDisplayName: getOpponentLabel(game, session.user.id),
      playerColor: getPlayerColor(game, session.user.id),
      result: game.result,
      resultReason: game.resultReason,
      finalFen: game.finalFen,
      plyCount: game.plyCount,
      startedAt: game.startedAt.toISOString(),
      endedAt: game.endedAt.toISOString(),
      status: game.status,
      lastSeq: game.lastSeq,
      openingName: game.openingName,
      openingEco: game.openingEco,
    })),
  });
}

