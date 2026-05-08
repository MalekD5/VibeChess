import { validateAndApplyMove, getInitialFen } from '@/engine/chess-engine';
import type {
  CanonicalGameEvent,
  GameAction,
  GameEndEvent,
  GameMode,
  GameState,
  HistoryResultReason,
  MoveGameEvent,
  Player,
  PlayerColor,
} from '@/types/game';

function now(): number {
  return Date.now();
}

function oppositeColor(color: PlayerColor): PlayerColor {
  return color === 'white' ? 'black' : 'white';
}

export function createInitialState(gameId: string): GameState {
  return createInitialStateForOwner(gameId, gameId);
}

export function createInitialStateForOwner(
  gameId: string,
  ownerId: string,
  mode: GameMode = 'human',
): GameState {
  const initialFen = getInitialFen();
  return {
    gameId,
    ownerId,
    players: { white: null, black: null },
    mode,
    currentTurn: 'white',
    initialFen,
    fen: initialFen,
    status: 'waiting',
    result: null,
    moveHistory: [],
    events: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

function createPlayer(action: Extract<GameAction, { type: 'JOIN_GAME' }>): Player {
  if (action.playerKind === 'ai') {
    if (!action.aiDifficulty) {
      throw new Error('AI difficulty is required');
    }

    return {
      id: action.playerId,
      color: action.color,
      kind: 'ai',
      aiDifficulty: action.aiDifficulty,
    };
  }

  return {
    id: action.playerId,
    color: action.color,
    kind: 'human',
  };
}

function nextSeq(events: CanonicalGameEvent[]): number {
  return events.length + 1;
}

function eventTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function createMoveEvent(
  state: GameState,
  playerId: string,
  san: string,
  uci: string,
  fenAfter: string,
  timestamp: number,
): MoveGameEvent {
  const seq = nextSeq(state.events);
  return {
    id: `${state.gameId}:${seq}`,
    gameId: state.gameId,
    seq,
    type: 'move',
    actorId: playerId,
    createdAt: eventTimestamp(timestamp),
    schemaVersion: 1,
    ply: state.moveHistory.length + 1,
    playerId,
    uci,
    san,
    fenAfter,
  };
}

function toHistoryResult(outcome: NonNullable<GameState['result']>['outcome']): GameEndEvent['result'] {
  if (outcome === 'white_won') return 'white';
  if (outcome === 'black_won') return 'black';
  return 'draw';
}

function toHistoryReason(reason: NonNullable<GameState['result']>['reason']): HistoryResultReason {
  return reason === 'draw' ? 'unknown' : reason;
}

function appendGameEndEvent(
  events: CanonicalGameEvent[],
  gameId: string,
  actorId: string | undefined,
  result: NonNullable<GameState['result']>,
  finalFen: string,
  timestamp: number,
): CanonicalGameEvent[] {
  const seq = nextSeq(events);
  return [
    ...events,
    {
      id: `${gameId}:${seq}`,
      gameId,
      seq,
      type: 'game.end',
      actorId,
      createdAt: eventTimestamp(timestamp),
      schemaVersion: 1,
      result: toHistoryResult(result.outcome),
      reason: toHistoryReason(result.reason),
      finalFen,
    },
  ];
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'JOIN_GAME': {
      if (state.status === 'finished') {
        throw new Error('Cannot join a finished game');
      }

      const existingColor =
        state.players.white?.id === action.playerId
          ? 'white'
          : state.players.black?.id === action.playerId
            ? 'black'
            : null;

      if (existingColor === action.color) {
        return state;
      }

      if (existingColor !== null) {
        throw new Error(`Player already joined as ${existingColor}`);
      }

      if (state.status !== 'waiting') {
        throw new Error('Cannot join a game that has already started');
      }

      if (state.players[action.color] !== null) {
        throw new Error(`Color ${action.color} is already taken`);
      }
      const players = {
        ...state.players,
        [action.color]: createPlayer(action),
      };
      const bothJoined = players.white !== null && players.black !== null;
      return {
        ...state,
        players,
        status: bothJoined ? 'active' : 'waiting',
        updatedAt: now(),
      };
    }

    case 'MAKE_MOVE': {
      if (state.status !== 'active') {
        throw new Error('Cannot make a move when game is not active');
      }
      const movingPlayer = state.players[state.currentTurn];
      if (!movingPlayer || movingPlayer.id !== action.playerId) {
        throw new Error('It is not this player\'s turn');
      }
      const result = validateAndApplyMove(state.fen, action.move);
      if (!result) {
        throw new Error('Illegal move');
      }
      const isTerminal = result.isCheckmate || result.isStalemate || result.isDraw;
      const gameResult = result.isCheckmate
        ? {
            outcome: `${state.currentTurn}_won` as const,
            reason: 'checkmate' as const,
          }
        : result.isStalemate
          ? { outcome: 'draw' as const, reason: 'stalemate' as const }
          : result.isDraw
            ? { outcome: 'draw' as const, reason: 'draw' as const }
            : null;
      const updatedAt = now();
      const moveEvent = createMoveEvent(
        state,
        action.playerId,
        result.san,
        result.uci,
        result.fen,
        updatedAt,
      );
      const events =
        gameResult === null
          ? [...state.events, moveEvent]
          : appendGameEndEvent(
              [...state.events, moveEvent],
              state.gameId,
              action.playerId,
              gameResult,
              result.fen,
              updatedAt,
            );

      return {
        ...state,
        fen: result.fen,
        moveHistory: [...state.moveHistory, result.san],
        events,
        currentTurn: oppositeColor(state.currentTurn),
        status: isTerminal ? 'finished' : 'active',
        result: gameResult,
        updatedAt,
      };
    }

    case 'RESIGN': {
      if (state.status !== 'active') {
        throw new Error('Cannot resign when game is not active');
      }

      const resignedPlayer =
        state.players.white?.id === action.playerId ||
        state.players.black?.id === action.playerId;

      if (!resignedPlayer) {
        throw new Error("Only a seated player can resign");
      }

      const updatedAt = now();
      const result = {
        outcome:
          state.players.white?.id === action.playerId
            ? ('black_won' as const)
            : ('white_won' as const),
        reason: 'resignation' as const,
      };

      return {
        ...state,
        status: 'finished',
        result,
        events: appendGameEndEvent(
          state.events,
          state.gameId,
          action.playerId,
          result,
          state.fen,
          updatedAt,
        ),
        updatedAt,
      };
    }

    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${(_exhaustive as GameAction).type}`);
    }
  }
}
