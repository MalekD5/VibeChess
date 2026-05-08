import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * Issues a short-lived Ably JWT for a specific game channel.
 *
 * The server generates a fresh `clientId` via `crypto.randomUUID()` — callers
 * cannot supply their own identity. The returned token's capability is scoped
 * exclusively to `game:{gameId}` (subscribe + publish), preventing access to
 * any other channel.
 *
 * @param req - Incoming request. Must include a `gameId` query parameter
 *   identifying the game channel the client needs access to.
 * @returns `200` with the signed JWT string, or an error JSON with an
 *   appropriate status code (`400` for missing `gameId`, `500` for
 *   misconfigured `ABLY_API_KEY`).
 * @throws Never — errors are returned as JSON responses.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to connect to realtime.' },
      { status: 401 },
    );
  }

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ABLY_API_KEY is not set' }, { status: 500 });
  }

  const gameId = req.nextUrl.searchParams.get('gameId');
  if (!gameId) {
    return NextResponse.json({ error: 'gameId query param is required' }, { status: 400 });
  }

  const colonIndex = apiKey.indexOf(':');
  if (colonIndex === -1) {
    return NextResponse.json({ error: 'Malformed ABLY_API_KEY' }, { status: 500 });
  }

  const keyName = apiKey.slice(0, colonIndex);
  const keySecret = apiKey.slice(colonIndex + 1);
  if (!keyName || !keySecret) {
    return NextResponse.json({ error: 'Malformed ABLY_API_KEY' }, { status: 500 });
  }

  const nonce = crypto.randomUUID();

  const token = jwt.sign(
    {
      'x-ably-capability': JSON.stringify({ [`game:${gameId}`]: ['subscribe', 'publish'] }),
      'x-ably-clientId': session.user.id,
      'vibechess-nonce': nonce,
    },
    keySecret,
    { expiresIn: '1h', keyid: keyName },
  );

  return NextResponse.json(token);
}
