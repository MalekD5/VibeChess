import type { HistoryResult, HistoryResultReason, PlayerColor } from '@/types/game';

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
