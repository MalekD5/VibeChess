import { buildMoveEventsFromSanHistory } from '@/engine/chess-engine';
import {
  PLAYER_COLORS,
  STANDARD_INITIAL_FEN,
  type CanonicalGameEvent,
  type GameEndEvent,
  type GameMode,
  type GameState,
  type HistoryResultReason,
  type Player,
} from '@/types/game';

interface LegacyGameState extends Partial<GameState> {
  gameId: string;
  players: { white: Player | null; black: Player | null };
  currentTurn: GameState['currentTurn'];
  fen: string;
  status: GameState['status'];
  result: GameState['result'];
  moveHistory: string[];
  createdAt: number;
  updatedAt: number;
}

function inferOwnerId(state: LegacyGameState): string {
  for (const color of PLAYER_COLORS) {
    const player = state.players[color];
    if (player && player.kind !== 'ai') return player.id;
  }

  return state.gameId;
}

function inferMode(state: LegacyGameState): GameMode {
  return PLAYER_COLORS.some((color) => state.players[color]?.kind === 'ai')
    ? 'ai'
    : 'human';
}

function toHistoryResult(result: NonNullable<GameState['result']>['outcome']): GameEndEvent['result'] {
  if (result === 'white_won') return 'white';
  if (result === 'black_won') return 'black';
  return 'draw';
}

function toHistoryReason(reason: NonNullable<GameState['result']>['reason']): HistoryResultReason {
  return reason === 'draw' ? 'unknown' : reason;
}

function appendTerminalEventIfNeeded(
  state: LegacyGameState,
  events: CanonicalGameEvent[],
): CanonicalGameEvent[] {
  if (state.status !== 'finished' || !state.result) return events;
  if (events.some((event) => event.type === 'game.end')) return events;

  const seq = events.length + 1;
  return [
    ...events,
    {
      id: `${state.gameId}:${seq}`,
      gameId: state.gameId,
      seq,
      type: 'game.end',
      createdAt: new Date(state.updatedAt).toISOString(),
      schemaVersion: 1,
      result: toHistoryResult(state.result.outcome),
      reason: toHistoryReason(state.result.reason),
      finalFen: state.fen,
    },
  ];
}

export function normalizeGameState(state: GameState): GameState {
  const legacyState = state as LegacyGameState;
  const initialFen = legacyState.initialFen ?? STANDARD_INITIAL_FEN;
  const events =
    legacyState.events ??
    buildMoveEventsFromSanHistory(
      legacyState.gameId,
      initialFen,
      legacyState.moveHistory,
      legacyState.players,
      legacyState.createdAt,
    );

  return {
    ...legacyState,
    ownerId: legacyState.ownerId ?? inferOwnerId(legacyState),
    mode: legacyState.mode ?? inferMode(legacyState),
    initialFen,
    events: appendTerminalEventIfNeeded(legacyState, events),
  };
}

