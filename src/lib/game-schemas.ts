import { z } from 'zod';
import {
  AI_DIFFICULTIES,
  GAME_OUTCOMES,
  GAME_MODES,
  GAME_RESULT_REASONS,
  GAME_STATUSES,
  HISTORY_RESULT_REASONS,
  HISTORY_RESULTS,
  PLAYER_COLORS,
  PLAYER_KINDS,
  STANDARD_INITIAL_FEN,
  type CanonicalGameEvent,
  type GameAction,
  type GameState,
} from '@/types/game';

export const PlayerColorSchema = z.enum(PLAYER_COLORS);
export const AiDifficultySchema = z.enum(AI_DIFFICULTIES);
export const PlayerKindSchema = z.enum(PLAYER_KINDS);
export const GameStatusSchema = z.enum(GAME_STATUSES);
export const GameResultReasonSchema = z.enum(GAME_RESULT_REASONS);
export const GameOutcomeSchema = z.enum(GAME_OUTCOMES);
export const GameModeSchema = z.enum(GAME_MODES);
export const HistoryResultSchema = z.enum(HISTORY_RESULTS);
export const HistoryResultReasonSchema = z.enum(HISTORY_RESULT_REASONS);

const NonEmptyStringSchema = z.string().min(1);
const ChessSquareSchema = z.string().regex(/^[a-h][1-8]$/);
const PromotionPieceSchema = z.string().regex(/^[nbrqNBRQ]$/);

export const MoveInputSchema = z.union([
  NonEmptyStringSchema,
  z.object({
    from: ChessSquareSchema,
    to: ChessSquareSchema,
    promotion: PromotionPieceSchema.optional(),
  }),
]);

export const JoinGameActionSchema = z.object({
  type: z.literal('JOIN_GAME'),
  playerId: NonEmptyStringSchema,
  color: PlayerColorSchema,
  playerKind: PlayerKindSchema.optional(),
  aiDifficulty: AiDifficultySchema.optional(),
});

export const MakeMoveActionSchema = z.object({
  type: z.literal('MAKE_MOVE'),
  playerId: NonEmptyStringSchema,
  move: MoveInputSchema,
});

export const ResignActionSchema = z.object({
  type: z.literal('RESIGN'),
  playerId: NonEmptyStringSchema,
});

export const GameActionSchema = z.discriminatedUnion('type', [
  JoinGameActionSchema,
  MakeMoveActionSchema,
  ResignActionSchema,
]);

const ClientJoinGameActionSchema = z
  .looseObject({
    type: z.literal('JOIN_GAME'),
    playerId: NonEmptyStringSchema,
    color: PlayerColorSchema,
  })
  .transform((action) => ({
    type: action.type,
    playerId: action.playerId,
    color: action.color,
  }));

const ClientGameActionSchema = z.union([
  ClientJoinGameActionSchema,
  MakeMoveActionSchema.loose().transform((action) => ({
    type: action.type,
    playerId: action.playerId,
    move: action.move,
  })),
  ResignActionSchema.loose().transform((action) => ({
    type: action.type,
    playerId: action.playerId,
  })),
]);

const HumanPlayerSchema = z
  .object({
    id: NonEmptyStringSchema,
    color: PlayerColorSchema,
    kind: z.literal('human').optional().default('human'),
  })
  .transform((player) => ({ ...player, kind: 'human' as const }));

const AiPlayerSchema = z.object({
  id: NonEmptyStringSchema,
  color: PlayerColorSchema,
  kind: z.literal('ai'),
  aiDifficulty: AiDifficultySchema,
});

const PlayerSchema = z.union([AiPlayerSchema, HumanPlayerSchema]);

const GameResultSchema = z.object({
  outcome: GameOutcomeSchema,
  reason: GameResultReasonSchema,
});

const BaseGameEventSchema = z.object({
  id: NonEmptyStringSchema,
  gameId: NonEmptyStringSchema,
  seq: z.number().int().positive(),
  actorId: NonEmptyStringSchema.optional(),
  createdAt: NonEmptyStringSchema,
  schemaVersion: z.number().int().positive(),
  idempotencyKey: NonEmptyStringSchema.optional(),
});

const MoveGameEventSchema = BaseGameEventSchema.extend({
  type: z.literal('move'),
  ply: z.number().int().positive(),
  playerId: NonEmptyStringSchema,
  uci: NonEmptyStringSchema,
  san: NonEmptyStringSchema,
  fenAfter: NonEmptyStringSchema,
});

const GameEndEventSchema = BaseGameEventSchema.extend({
  type: z.literal('game.end'),
  result: z.enum(['white', 'black', 'draw']),
  reason: HistoryResultReasonSchema,
  finalFen: NonEmptyStringSchema,
});

const CanonicalGameEventSchema = z.discriminatedUnion('type', [
  MoveGameEventSchema,
  GameEndEventSchema,
]) satisfies z.ZodType<CanonicalGameEvent>;

const TimestampSchema = z.union([
  z.number(),
  z
    .string()
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value)),
]);

export const GameStateSchema = z.object({
  gameId: NonEmptyStringSchema,
  ownerId: NonEmptyStringSchema,
  players: z.object({
    white: PlayerSchema.nullable(),
    black: PlayerSchema.nullable(),
  }),
  mode: GameModeSchema,
  currentTurn: PlayerColorSchema,
  initialFen: NonEmptyStringSchema,
  fen: NonEmptyStringSchema,
  status: GameStatusSchema,
  result: GameResultSchema.nullish().transform((result) => result ?? null),
  moveHistory: z.array(NonEmptyStringSchema),
  events: z.array(CanonicalGameEventSchema),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
}) satisfies z.ZodType<GameState>;

export const HumanGameCreationRequestSchema = z
  .looseObject({
    mode: z.literal('human').optional().default('human'),
  })
  .transform(() => ({ mode: 'human' as const }));

export const AiGameCreationRequestSchema = z.looseObject({
  mode: z.literal('ai'),
  playerColor: PlayerColorSchema,
  aiDifficulty: AiDifficultySchema,
});

export const GameCreationRequestSchema = z.union([
  AiGameCreationRequestSchema,
  HumanGameCreationRequestSchema,
]);

export type GameCreationRequest = z.infer<typeof GameCreationRequestSchema>;

const JsonObjectSchema = z.looseObject({});
const GameCreationModeSchema = z.enum(GAME_MODES);

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
    const humanResult = HumanGameCreationRequestSchema.safeParse(bodyObject);
    if (humanResult.success) {
      return humanResult.data;
    }

    throw new Error('Game mode must be human or ai');
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

  const result = GameStateSchema.safeParse(normalizeLegacyGameStateMessage(msg));
  return result.success ? result.data : null;
}

function normalizeLegacyGameStateMessage(msg: Record<string, unknown>): Record<string, unknown> {
  if (!('gameId' in msg) || !('players' in msg) || !('fen' in msg)) {
    return msg;
  }

  return {
    ...msg,
    ownerId: msg.ownerId ?? inferLegacyOwnerId(msg.players) ?? msg.gameId,
    mode: msg.mode ?? inferLegacyMode(msg.players),
    initialFen: msg.initialFen ?? STANDARD_INITIAL_FEN,
    events: msg.events ?? [],
  };
}

function inferLegacyOwnerId(players: unknown): string | null {
  if (typeof players !== 'object' || players === null) return null;

  const seats = players as Record<string, unknown>;
  for (const color of PLAYER_COLORS) {
    const player = seats[color];
    if (typeof player !== 'object' || player === null) continue;
    const id = (player as Record<string, unknown>).id;
    const kind = (player as Record<string, unknown>).kind;
    if (typeof id === 'string' && kind !== 'ai') {
      return id;
    }
  }

  return null;
}

function inferLegacyMode(players: unknown): 'human' | 'ai' {
  if (typeof players !== 'object' || players === null) return 'human';

  const seats = players as Record<string, unknown>;
  return PLAYER_COLORS.some((color) => {
    const player = seats[color];
    return (
      typeof player === 'object' &&
      player !== null &&
      (player as Record<string, unknown>).kind === 'ai'
    );
  })
    ? 'ai'
    : 'human';
}
