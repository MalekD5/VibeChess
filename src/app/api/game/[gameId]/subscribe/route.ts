import { NextRequest, NextResponse } from 'next/server';
import { ablyGameAdapter } from '@/adapters/ably-game-adapter';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { gameId } = await params;

  if (ablyGameAdapter.isSubscribed(gameId)) {
    return NextResponse.json({ gameId, subscribed: true });
  }

  try {
    await ablyGameAdapter.subscribe(gameId);
    return NextResponse.json({ gameId, subscribed: true });
  } catch (err) {
    console.error('[subscribe] failed to subscribe to game:', gameId, err);
    return NextResponse.json(
      { gameId, subscribed: false, error: 'subscription_failed' },
      { status: 500 }
    );
  }
}
