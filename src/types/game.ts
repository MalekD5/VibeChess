export type PlayerColor = 'white' | 'black';
export type GameStatus = 'waiting' | 'active' | 'finished';

export interface Player {
  id: string;
  color: PlayerColor;
}

export interface GameState {
  gameId: string;
  players: { white: Player | null; black: Player | null };
  currentTurn: PlayerColor;
  fen: string;
  status: GameStatus;
  moveHistory: string[];
  createdAt: number;
  updatedAt: number;
}

export type MoveInput = string | { from: string; to: string; promotion?: string };

export type GameAction =
  | { type: 'JOIN_GAME'; playerId: string; color: PlayerColor }
  | { type: 'MAKE_MOVE'; playerId: string; move: MoveInput }
  | { type: 'RESIGN'; playerId: string };
