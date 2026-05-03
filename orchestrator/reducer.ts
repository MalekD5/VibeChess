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
      return {
        ...state,
        fen: result.fen,
        moveHistory: [...state.moveHistory, result.san],
        currentTurn: oppositeColor(state.currentTurn),
        status: isTerminal ? 'finished' : 'active',
        updatedAt: now(),
      };
    }

    case 'RESIGN': {
      if (state.status !== 'active') {
        throw new Error('Cannot resign when game is not active');
      }
      return {
        ...state,
        status: 'finished',
        updatedAt: now(),
      };
    }

    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${(_exhaustive as GameAction).type}`);
    }
  }
}
