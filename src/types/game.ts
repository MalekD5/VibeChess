export type PlayerColor = 'white' | 'black';
export type PlayerKind = 'human' | 'ai';
export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type GameStatus = 'waiting' | 'active' | 'finished';
export type GameResultReason = 'checkmate' | 'stalemate' | 'draw' | 'resignation';
export type GameOutcome = 'white_won' | 'black_won' | 'draw';

export interface HumanPlayer {
  id: string;
  color: PlayerColor;
  kind: 'human';
}

export interface AiPlayer {
  id: string;
  color: PlayerColor;
  kind: 'ai';
  aiDifficulty: AiDifficulty;
}

export type Player = HumanPlayer | AiPlayer;

export interface GameState {
  gameId: string;
  players: { white: Player | null; black: Player | null };
  currentTurn: PlayerColor;
  fen: string;
  status: GameStatus;
  result: { outcome: GameOutcome; reason: GameResultReason } | null;
  moveHistory: string[];
  createdAt: number;
  updatedAt: number;
}

export type MoveInput = string | { from: string; to: string; promotion?: string };

export type GameAction =
  | {
      type: 'JOIN_GAME';
      playerId: string;
      color: PlayerColor;
      playerKind?: PlayerKind;
      aiDifficulty?: AiDifficulty;
    }
  | { type: 'MAKE_MOVE'; playerId: string; move: MoveInput }
  | { type: 'RESIGN'; playerId: string };
