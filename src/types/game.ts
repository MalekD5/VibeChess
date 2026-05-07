export const PLAYER_COLORS = ['white', 'black'] as const;
export const PLAYER_KINDS = ['human', 'ai'] as const;
export const AI_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const GAME_STATUSES = ['waiting', 'active', 'finished'] as const;
export const GAME_RESULT_REASONS = [
  'checkmate',
  'stalemate',
  'draw',
  'resignation',
] as const;
export const GAME_OUTCOMES = ['white_won', 'black_won', 'draw'] as const;

export type PlayerColor = (typeof PLAYER_COLORS)[number];
export type PlayerKind = (typeof PLAYER_KINDS)[number];
export type AiDifficulty = (typeof AI_DIFFICULTIES)[number];
export type GameStatus = (typeof GAME_STATUSES)[number];
export type GameResultReason = (typeof GAME_RESULT_REASONS)[number];
export type GameOutcome = (typeof GAME_OUTCOMES)[number];

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
