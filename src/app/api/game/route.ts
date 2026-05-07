import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ablyGameAdapter } from '@/adapters/ably-game-adapter';
import { gameManager } from '@/manager/game-manager';
import { playAiTurnIfNeeded } from '@/manager/ai-turn';
import type { AiDifficulty, GameState, PlayerColor } from '@/types/game';

export const runtime = 'nodejs';

interface HumanGameSetup {
  mode: 'human';
}

interface AiGameSetup {
  mode: 'ai';
  playerColor: PlayerColor;
  aiDifficulty: AiDifficulty;
}

type GameSetup = HumanGameSetup | AiGameSetup;

function isPlayerColor(value: unknown): value is PlayerColor {
  return value === 'white' || value === 'black';
}

function isAiDifficulty(value: unknown): value is AiDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

function oppositeColor(color: PlayerColor): PlayerColor {
  return color === 'white' ? 'black' : 'white';
}

async function parseGameSetup(req: Request): Promise<GameSetup> {
  const rawBody = await req.text();
  if (!rawBody.trim()) {
    return { mode: 'human' };
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error('Invalid JSON body');
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new Error('Request body must be an object');
  }

  const obj = body as Record<string, unknown>;
  const mode = obj.mode ?? 'human';

  if (mode === 'human') {
    return { mode: 'human' };
  }

  if (mode !== 'ai') {
    throw new Error('Game mode must be human or ai');
  }

  if (!isPlayerColor(obj.playerColor)) {
    throw new Error('Player color is required for AI mode');
  }

  if (!isAiDifficulty(obj.aiDifficulty)) {
    throw new Error('AI difficulty is required for AI mode');
  }

  return {
    mode,
    playerColor: obj.playerColor,
    aiDifficulty: obj.aiDifficulty,
  };
}

async function createAiGame(
  gameId: string,
  setup: AiGameSetup,
): Promise<{ state: GameState; playerId: string }> {
  const playerId = crypto.randomUUID();
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
  let setup: GameSetup;
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

  try {
    let state = await gameManager.createGame(gameId);
    gameCreated = true;
    await ablyGameAdapter.subscribe(gameId);

    if (setup.mode === 'ai') {
      const aiGame = await createAiGame(gameId, setup);
      state = aiGame.state;
      return NextResponse.json({
        gameId,
        channelName,
        state,
        playerId: aiGame.playerId,
      });
    }

    return NextResponse.json({ gameId, channelName, state });
  } catch (err) {
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
