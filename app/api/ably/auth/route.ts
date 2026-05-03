import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function GET(req: NextRequest): NextResponse {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ABLY_API_KEY is not set' }, { status: 500 });
  }

  const clientId = req.nextUrl.searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'clientId query param is required' }, { status: 400 });
  }

  const colonIndex = apiKey.indexOf(':');
  if (colonIndex === -1) {
    return NextResponse.json({ error: 'Malformed ABLY_API_KEY' }, { status: 500 });
  }

  const keyName = apiKey.slice(0, colonIndex);
  const keySecret = apiKey.slice(colonIndex + 1);

  const token = jwt.sign(
    {
      'x-ably-capability': JSON.stringify({ 'game:*': ['subscribe', 'publish'] }),
      'x-ably-clientId': clientId,
    },
    keySecret,
    { expiresIn: '1h', keyid: keyName },
  );

  return NextResponse.json(token);
}
