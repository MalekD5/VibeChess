import { NextRequest, NextResponse } from 'next/server';
import { ablyGameAdapter } from '@/adapters/ably-game-adapter';
import { getActiveGameAccess } from '@/lib/active-game-access';
import { getCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to connect to realtime.' },
      { status: 401 },
    );
  }

  const { gameId } = await params;
  const inviteToken = req.headers.get('x-invite-token');

  try {
    const access = await getActiveGameAccess({
      gameId,
      userId: session.user.id,
      inviteToken,
    });

    if (!access.ok) {
      if (access.reason === 'not_found') {
        return NextResponse.json(
          { gameId, subscribed: false, error: 'game_not_found' },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { gameId, subscribed: false, error: 'forbidden' },
        { status: 403 },
      );
    }

    if (ablyGameAdapter.isSubscribed(gameId)) {
      return NextResponse.json({ gameId, subscribed: true });
    }

    await ablyGameAdapter.subscribe(gameId);
    return NextResponse.json({ gameId, subscribed: true });
  } catch (err) {
    console.error('[subscribe] failed to subscribe to game:', gameId, err);
    return NextResponse.json(
      { gameId, subscribed: false, error: 'subscription_failed' },
      { status: 500 },
    );
  }
}
