import { NextResponse } from 'next/server';
import {
  encodePlayerHistoryCursor,
  getPlayerHistoryBatch,
  parsePlayerHistoryCursor,
} from '@/lib/game-history';
import { getCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';

function parseLimit(value: string | null): number {
  if (!value) return 5;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 5;

  return Math.min(Math.max(parsed, 1), 5);
}

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to view game history.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const data = await getPlayerHistoryBatch({
    userId: session.user.id,
    displayName: session.user.name,
    cursor: parsePlayerHistoryCursor(searchParams.get('cursor')),
    limit: parseLimit(searchParams.get('limit')),
  });

  return NextResponse.json({
    games: data.games,
    hasMore: data.hasMore,
    nextCursor: encodePlayerHistoryCursor(data.nextCursor),
  });
}
