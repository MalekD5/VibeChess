import { NextResponse } from 'next/server';
import { gameManager } from '@/manager/game-manager';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

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
