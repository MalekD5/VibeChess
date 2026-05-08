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
export const GAME_MODES = ['human', 'ai'] as const;
export const HISTORY_GAME_STATUSES = ['completed', 'abandoned', 'recoverable'] as const;
export const HISTORY_RESULTS = ['white', 'black', 'draw', 'unknown'] as const;
export const HISTORY_RESULT_REASONS = [
  'checkmate',
  'stalemate',
  'resignation',
  'draw-agreement',
  'timeout',
  'abandonment',
  'unknown',
] as const;
export const STANDARD_INITIAL_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type PlayerColor = (typeof PLAYER_COLORS)[number];
export type PlayerKind = (typeof PLAYER_KINDS)[number];
export type AiDifficulty = (typeof AI_DIFFICULTIES)[number];
export type GameStatus = (typeof GAME_STATUSES)[number];
export type GameResultReason = (typeof GAME_RESULT_REASONS)[number];
export type GameOutcome = (typeof GAME_OUTCOMES)[number];
export type GameMode = (typeof GAME_MODES)[number];
export type HistoryGameStatus = (typeof HISTORY_GAME_STATUSES)[number];
export type HistoryResult = (typeof HISTORY_RESULTS)[number];
export type HistoryResultReason = (typeof HISTORY_RESULT_REASONS)[number];

export interface BaseGameEvent {
  id: string;
  gameId: string;
  seq: number;
  type: string;
  actorId?: string;
  createdAt: string;
  schemaVersion: number;
  idempotencyKey?: string;
}

export interface MoveGameEvent extends BaseGameEvent {
  type: 'move';
  ply: number;
  playerId: string;
  uci: string;
  san: string;
  fenAfter: string;
}

export interface GameEndEvent extends BaseGameEvent {
  type: 'game.end';
  result: Exclude<HistoryResult, 'unknown'>;
  reason: HistoryResultReason;
  finalFen: string;
}

export type CanonicalGameEvent = MoveGameEvent | GameEndEvent;

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
  ownerId: string;
  players: { white: Player | null; black: Player | null };
  mode: GameMode;
  currentTurn: PlayerColor;
  initialFen: string;
  fen: string;
  status: GameStatus;
  result: { outcome: GameOutcome; reason: GameResultReason } | null;
  moveHistory: string[];
  events: CanonicalGameEvent[];
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
