import { z } from 'zod';
import {
  AI_DIFFICULTIES,
  GAME_OUTCOMES,
  GAME_RESULT_REASONS,
  GAME_STATUSES,
  PLAYER_COLORS,
  PLAYER_KINDS,
  type GameAction,
  type GameState,
} from '@/types/game';

export const PlayerColorSchema = z.enum(PLAYER_COLORS);
export const AiDifficultySchema = z.enum(AI_DIFFICULTIES);
export const PlayerKindSchema = z.enum(PLAYER_KINDS);
export const GameStatusSchema = z.enum(GAME_STATUSES);
export const GameResultReasonSchema = z.enum(GAME_RESULT_REASONS);
export const GameOutcomeSchema = z.enum(GAME_OUTCOMES);

export const MoveInputSchema = z.union([
  z.string(),
  z.object({
    from: z.string(),
    to: z.string(),
    promotion: z.string().optional(),
  }),
]);

export const JoinGameActionSchema = z.object({
  type: z.literal('JOIN_GAME'),
  playerId: z.string(),
  color: PlayerColorSchema,
  playerKind: PlayerKindSchema.optional(),
  aiDifficulty: AiDifficultySchema.optional(),
});

export const MakeMoveActionSchema = z.object({
  type: z.literal('MAKE_MOVE'),
  playerId: z.string(),
  move: MoveInputSchema,
});

export const ResignActionSchema = z.object({
  type: z.literal('RESIGN'),
  playerId: z.string(),
});

export const GameActionSchema = z.discriminatedUnion('type', [
  JoinGameActionSchema,
  MakeMoveActionSchema,
  ResignActionSchema,
]);

const ClientJoinGameActionSchema = z
  .object({
    type: z.literal('JOIN_GAME'),
    playerId: z.string(),
    color: PlayerColorSchema,
  })
  .passthrough()
  .transform((action) => ({
    type: action.type,
    playerId: action.playerId,
    color: action.color,
  }));

const ClientGameActionSchema = z.union([
  ClientJoinGameActionSchema,
  MakeMoveActionSchema.passthrough().transform((action) => ({
    type: action.type,
    playerId: action.playerId,
    move: action.move,
  })),
  ResignActionSchema.passthrough().transform((action) => ({
    type: action.type,
    playerId: action.playerId,
  })),
]);

const HumanPlayerSchema = z
  .object({
    id: z.string(),
    color: PlayerColorSchema,
    kind: z.literal('human').optional().default('human'),
  })
  .transform((player) => ({ ...player, kind: 'human' as const }));

const AiPlayerSchema = z.object({
  id: z.string(),
  color: PlayerColorSchema,
  kind: z.literal('ai'),
  aiDifficulty: AiDifficultySchema,
});

const PlayerSchema = z.union([AiPlayerSchema, HumanPlayerSchema]);

const GameResultSchema = z.object({
  outcome: GameOutcomeSchema,
  reason: GameResultReasonSchema,
});

const TimestampSchema = z.union([
  z.number(),
  z
    .string()
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value)),
]);

export const GameStateSchema = z.object({
  gameId: z.string(),
  players: z.object({
    white: PlayerSchema.nullable(),
    black: PlayerSchema.nullable(),
  }),
  currentTurn: PlayerColorSchema,
  fen: z.string(),
  status: GameStatusSchema,
  result: GameResultSchema.nullish().transform((result) => result ?? null),
  moveHistory: z.array(z.string()),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
}) satisfies z.ZodType<GameState>;

export const HumanGameCreationRequestSchema = z
  .object({
    mode: z.literal('human').optional().default('human'),
  })
  .passthrough()
  .transform(() => ({ mode: 'human' as const }));

export const AiGameCreationRequestSchema = z
  .object({
    mode: z.literal('ai'),
    playerColor: PlayerColorSchema,
    aiDifficulty: AiDifficultySchema,
  })
  .passthrough();

export const GameCreationRequestSchema = z.union([
  AiGameCreationRequestSchema,
  HumanGameCreationRequestSchema,
]);

export type GameCreationRequest = z.infer<typeof GameCreationRequestSchema>;

const JsonObjectSchema = z.object({}).passthrough();
const GameCreationModeSchema = z.enum(['human', 'ai']);

function parseJsonBody(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error('Invalid JSON body');
  }
}

export function parseGameCreationRequestBody(rawBody: string): GameCreationRequest {
  if (!rawBody.trim()) {
    return { mode: 'human' };
  }

  const body = parseJsonBody(rawBody);
  const objectResult = JsonObjectSchema.safeParse(body);

  if (!objectResult.success || Array.isArray(body)) {
    throw new Error('Request body must be an object');
  }

  const bodyObject = objectResult.data;
  const modeResult = GameCreationModeSchema.safeParse(bodyObject.mode ?? 'human');

  if (!modeResult.success) {
    throw new Error('Game mode must be human or ai');
  }

  if (modeResult.data === 'human') {
    return HumanGameCreationRequestSchema.parse(bodyObject);
  }

  const aiResult = AiGameCreationRequestSchema.safeParse(bodyObject);
  if (aiResult.success) {
    return aiResult.data;
  }

  const playerColorResult = PlayerColorSchema.safeParse(bodyObject.playerColor);
  if (!playerColorResult.success) {
    throw new Error(
      bodyObject.playerColor === undefined
        ? 'Player color is required for AI mode'
        : 'Invalid player color for AI mode',
    );
  }

  throw new Error('AI difficulty is required for AI mode');
}

export function parseRealtimePayloadObject(value: unknown): Record<string, unknown> | null {
  let current = value;

  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current === 'string') {
      try {
        current = JSON.parse(current) as unknown;
        continue;
      } catch {
        return null;
      }
    }

    if (typeof current !== 'object' || current === null) {
      return null;
    }

    const obj = current as Record<string, unknown>;

    if ('players' in obj || 'type' in obj || 'message' in obj) {
      return obj;
    }

    if ('state' in obj) {
      current = obj.state;
      continue;
    }

    if ('data' in obj) {
      current = obj.data;
      continue;
    }

    return obj;
  }

  return null;
}

export function parseClientGameActionMessage(data: unknown): GameAction | null {
  const msg = parseRealtimePayloadObject(data);
  if (!msg) return null;

  const result = ClientGameActionSchema.safeParse(msg);
  return result.success ? result.data : null;
}

export function parseGameStateMessage(data: unknown): GameState | null {
  const msg = parseRealtimePayloadObject(data);
  if (!msg) return null;

  const result = GameStateSchema.safeParse(msg);
  return result.success ? result.data : null;
}
