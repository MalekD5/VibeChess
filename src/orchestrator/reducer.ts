import { validateAndApplyMove, getInitialFen } from '@/engine/chess-engine';
import type { GameState, GameAction, PlayerColor } from '@/types/game';

function now(): number {
  return Date.now();
}

function oppositeColor(color: PlayerColor): PlayerColor {
  return color === 'white' ? 'black' : 'white';
}

export function createInitialState(gameId: string): GameState {
  return {
    gameId,
    players: { white: null, black: null },
      currentTurn: 'white',
      fen: getInitialFen(),
      status: 'waiting',
      result: null,
      moveHistory: [],
      createdAt: now(),
      updatedAt: now(),
  };
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
        [action.color]: { id: action.playerId, color: action.color },
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

      return {
        ...state,
        fen: result.fen,
        moveHistory: [...state.moveHistory, result.san],
        currentTurn: oppositeColor(state.currentTurn),
        status: isTerminal ? 'finished' : 'active',
        result: gameResult,
        updatedAt: now(),
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

      return {
        ...state,
        status: 'finished',
        result: {
          outcome:
            state.players.white?.id === action.playerId ? 'black_won' : 'white_won',
          reason: 'resignation',
        },
        updatedAt: now(),
      };
    }

    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${(_exhaustive as GameAction).type}`);
    }
  }
}
