import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ablyGameAdapter } from '@/adapters/ably-game-adapter';
import { gameManager } from '@/manager/game-manager';
import { playAiTurnIfNeeded } from '@/manager/ai-turn';
import type { GameState, PlayerColor } from '@/types/game';
import {
  createActiveGameInvite,
  revokeActiveGameInvite,
} from '@/lib/active-game-invites';
import {
  parseGameCreationRequestBody,
  type GameCreationRequest,
} from '@/lib/game-schemas';
import { getCurrentSession } from '@/lib/session';

export const runtime = 'nodejs';

type AiGameSetup = Extract<GameCreationRequest, { mode: 'ai' }>;

function oppositeColor(color: PlayerColor): PlayerColor {
  return color === 'white' ? 'black' : 'white';
}

async function parseGameSetup(req: Request): Promise<GameCreationRequest> {
  const rawBody = await req.text();
  return parseGameCreationRequestBody(rawBody);
}

async function createAiGame(
  gameId: string,
  setup: AiGameSetup,
  playerId: string,
): Promise<{ state: GameState; playerId: string }> {
  const aiColor = oppositeColor(setup.playerColor);
  const aiPlayerId = `ai:${gameId}`;

  let state = await gameManager.processEvent(gameId, {
    type: 'JOIN_GAME',
    playerId,
    color: setup.playerColor,
  });
  await ablyGameAdapter.publishState(gameId, state);

  state = await gameManager.processEvent(gameId, {
    type: 'JOIN_GAME',
    playerId: aiPlayerId,
    color: aiColor,
    playerKind: 'ai',
    aiDifficulty: setup.aiDifficulty,
  });
  await ablyGameAdapter.publishState(gameId, state);

  state = await playAiTurnIfNeeded(state, (nextState) =>
    ablyGameAdapter.publishState(gameId, nextState),
  );

  return { state, playerId };
}

/**
 * POST creates a new game session. A missing body preserves human game
 * creation. AI mode seats a generated human player and a virtual AI player.
 *
 * The handler first calls `gameManager.createGame` to create the in-memory game
 * state, then calls `ablyGameAdapter.subscribe` so the server can process
 * realtime events for the new game channel. If subscription fails after game
 * creation, `gameManager.deleteGame` runs as best-effort cleanup before the
 * subscription error response is returned.
 *
 * @returns A `200` JSON response shaped as
 * `{ gameId: string, channelName: string, state: object }` when game creation
 * and Ably subscription both succeed.
 *
 * Example success:
 * `{ "gameId": "uuid", "channelName": "game:uuid", "state": {} }`
 *
 * @throws Does not rethrow failures; errors are converted to JSON responses.
 * @errors `500` with `{ "error": "game_creation_failed" }` when
 * `gameManager.createGame` fails before a game exists.
 * @errors `500` with `{ "error": "subscription_failed" }` when
 * `ablyGameAdapter.subscribe` fails after creation. If the failure message
 * includes `ABLY_API_KEY`, the response includes the optional `message` field:
 * `{ "error": "subscription_failed", "message": "ABLY_API_KEY ..." }`.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to create a game.' },
      { status: 401 },
    );
  }

  let setup: GameCreationRequest;
  try {
    setup = await parseGameSetup(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid game setup';
    return NextResponse.json(
      { error: 'invalid_game_setup', message },
      { status: 400 },
    );
  }

  const gameId = crypto.randomUUID();
  const channelName = `game:${gameId}` as const;
  let gameCreated = false;
  let inviteToken: string | null = null;

  try {
    let state = await gameManager.createGame(gameId, session.user.id, setup.mode);
    gameCreated = true;
    if (setup.mode === 'human') {
      inviteToken = await createActiveGameInvite(gameId);
    }
    await ablyGameAdapter.subscribe(gameId);

    if (setup.mode === 'ai') {
      const aiGame = await createAiGame(gameId, setup, session.user.id);
      state = aiGame.state;
      return NextResponse.json({
        gameId,
        channelName,
        state,
        playerId: aiGame.playerId,
      });
    }

    return NextResponse.json({
      gameId,
      channelName,
      state,
      playerId: session.user.id,
      inviteToken,
    });
  } catch (err) {
    if (inviteToken) {
      await revokeActiveGameInvite(gameId);
    }

    if (gameCreated) {
      try {
        await gameManager.deleteGame(gameId);
      } catch {
        // The caller still receives the setup failure; cleanup is best-effort.
      }
    }

    if (err instanceof Error && err.message.includes('ABLY_API_KEY')) {
      return NextResponse.json(
        { error: 'subscription_failed', message: err.message },
        { status: 500 },
      );
    }

    if (gameCreated) {
      console.error('[game] failed to subscribe game:', gameId, err);
      return NextResponse.json({ error: 'subscription_failed' }, { status: 500 });
    }

    console.error('[game] failed to create game:', gameId, err);
    return NextResponse.json({ error: 'game_creation_failed' }, { status: 500 });
  }
}
