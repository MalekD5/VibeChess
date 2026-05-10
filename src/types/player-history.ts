import type { GameMode, HistoryGameStatus, HistoryResult, HistoryResultReason, PlayerColor } from '@/types/game';

export type PlayerHistoryPerspectiveResult = 'win' | 'loss' | 'draw' | 'unknown';

export interface PlayerHistoryCursor {
  endedAt: string;
  id: string;
}

export interface PlayerHistoryRow {
  id: string;
  whitePlayerDisplayName: string;
  blackPlayerDisplayName: string;
  winnerDisplayName: string | null;
  playerColor: PlayerColor | null;
  perspectiveResult: PlayerHistoryPerspectiveResult;
  result: HistoryResult;
  resultReason: HistoryResultReason;
  finalFen: string | null;
  endedAt: string;
  displayDate: string;
}

export interface PlayerHistoryOverview {
  displayName: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  mostRecentGameDate: string | null;
}

export interface PlayerHistoryPageData {
  overview: PlayerHistoryOverview;
  games: PlayerHistoryRow[];
  nextCursor: PlayerHistoryCursor | null;
  hasMore: boolean;
}

export interface HistoryReviewMove {
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  playerId: string;
  san: string;
  uci: string;
  from: string | null;
  to: string | null;
  fenAfter: string;
}

export interface HistoryReviewPosition {
  ply: number;
  fen: string;
  move: HistoryReviewMove | null;
}

export interface HistoryReviewGame {
  id: string;
  whitePlayerDisplayName: string;
  blackPlayerDisplayName: string;
  playerColor: PlayerColor | null;
  mode: GameMode;
  status: HistoryGameStatus;
  result: HistoryResult;
  resultReason: HistoryResultReason;
  initialFen: string;
  finalFen: string;
  startedAt: string;
  endedAt: string;
  displayEndedAt: string;
  plyCount: number;
  pgn: string | null;
  openingName: string | null;
  openingEco: string | null;
  moves: HistoryReviewMove[];
  positions: HistoryReviewPosition[];
}

export type HistoryReviewLoadResult =
  | { status: 'available'; review: HistoryReviewGame }
  | { status: 'unavailable' }
  | { status: 'not-found' };
