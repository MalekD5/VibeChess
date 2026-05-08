import { prisma } from '@/lib/prisma';
import type { Prisma } from '../../generated/prisma/client';
import type { PlayerHistoryCursor, PlayerHistoryPageData, PlayerHistoryRow } from '@/types/player-history';
import type {
  CanonicalGameEvent,
  GameState,
  HistoryResult,
  HistoryResultReason,
  PlayerColor,
} from '@/types/game';

const PLAYER_HISTORY_PAGE_SIZE = 5;
const AI_PLAYER_LABEL = 'Vibe AI';
const HUMAN_OPPONENT_LABEL = 'Human opponent';
const UNKNOWN_PLAYER_LABEL = 'Unknown player';

const historyDateFormatter = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

function toHistoryResult(result: NonNullable<GameState['result']>['outcome']): HistoryResult {
  if (result === 'white_won') return 'white';
  if (result === 'black_won') return 'black';
  return 'draw';
}

function toHistoryReason(reason: NonNullable<GameState['result']>['reason']): HistoryResultReason {
  return reason === 'draw' ? 'unknown' : reason;
}

function assertCanonicalEventOrder(events: CanonicalGameEvent[]): void {
  events.forEach((event, index) => {
    if (event.seq !== index + 1) {
      throw new Error(`Game event sequence gap at seq ${event.seq}`);
    }
  });
}

function countMoveEvents(events: CanonicalGameEvent[]): number {
  return events.filter((event) => event.type === 'move').length;
}

function findTerminalEvent(events: CanonicalGameEvent[]) {
  return events.find((event) => event.type === 'game.end') ?? null;
}

function toJsonEvents(events: CanonicalGameEvent[]): Prisma.InputJsonValue {
  return events.map((event) => ({ ...event })) as Prisma.InputJsonValue;
}

export async function persistCompletedGame(state: GameState): Promise<void> {
  if (state.status !== 'finished' || !state.result) {
    throw new Error('Only finished games can be persisted to history');
  }

  assertCanonicalEventOrder(state.events);
  const terminalEvent = findTerminalEvent(state.events);

  if (!terminalEvent || terminalEvent.type !== 'game.end') {
    throw new Error('Completed game history requires a terminal game.end event');
  }

  if (terminalEvent.finalFen !== state.fen) {
    throw new Error('Terminal event finalFen must match final game state');
  }

  const plyCount = countMoveEvents(state.events);
  if (plyCount !== state.moveHistory.length) {
    throw new Error('Stored move event count must match move history');
  }

  await prisma.chessGame.upsert({
    where: { id: state.gameId },
    create: {
      id: state.gameId,
      userId: state.ownerId,
      whitePlayerId: state.players.white?.id ?? null,
      blackPlayerId: state.players.black?.id ?? null,
      mode: state.mode,
      status: 'completed',
      result: toHistoryResult(state.result.outcome),
      resultReason: toHistoryReason(state.result.reason),
      initialFen: state.initialFen,
      finalFen: state.fen,
      events: toJsonEvents(state.events),
      startedAt: new Date(state.createdAt),
      endedAt: new Date(state.updatedAt),
      lastSeq: state.events.at(-1)?.seq ?? 0,
      plyCount,
    },
    update: {
      whitePlayerId: state.players.white?.id ?? null,
      blackPlayerId: state.players.black?.id ?? null,
      mode: state.mode,
      status: 'completed',
      result: toHistoryResult(state.result.outcome),
      resultReason: toHistoryReason(state.result.reason),
      initialFen: state.initialFen,
      finalFen: state.fen,
      events: toJsonEvents(state.events),
      endedAt: new Date(state.updatedAt),
      lastSeq: state.events.at(-1)?.seq ?? 0,
      plyCount,
    },
  });
}

export async function listGameHistoryForUser(userId: string) {
  return prisma.chessGame.findMany({
    where: {
      OR: [{ userId }, { whitePlayerId: userId }, { blackPlayerId: userId }],
    },
    orderBy: { endedAt: 'desc' },
    select: {
      id: true,
      userId: true,
      whitePlayerId: true,
      blackPlayerId: true,
      mode: true,
      status: true,
      result: true,
      resultReason: true,
      finalFen: true,
      startedAt: true,
      endedAt: true,
      lastSeq: true,
      plyCount: true,
      openingName: true,
      openingEco: true,
    },
  });
}

type CompactHistoryGame = Awaited<ReturnType<typeof listPlayerHistoryRows>>[number];

function getScopedCompletedHistoryWhere(userId: string): Prisma.ChessGameWhereInput {
  return {
    status: 'completed',
    OR: [{ userId }, { whitePlayerId: userId }, { blackPlayerId: userId }],
  };
}

function getCursorWhere(cursor: PlayerHistoryCursor | null): Prisma.ChessGameWhereInput {
  if (!cursor) return {};

  const endedAt = new Date(cursor.endedAt);
  if (Number.isNaN(endedAt.getTime())) return {};

  return {
    OR: [
      { endedAt: { lt: endedAt } },
      {
        endedAt,
        id: { lt: cursor.id },
      },
    ],
  };
}

function getPlayerColorForHistory(game: CompactHistoryGame, userId: string): PlayerColor | null {
  if (game.whitePlayerId === userId) return 'white';
  if (game.blackPlayerId === userId) return 'black';
  return null;
}

function getPlayerDisplayName(playerId: string | null, currentUserId: string, currentUserName: string): string {
  if (!playerId) return UNKNOWN_PLAYER_LABEL;
  if (playerId === currentUserId) return currentUserName;
  if (playerId.startsWith('ai:')) return AI_PLAYER_LABEL;
  return HUMAN_OPPONENT_LABEL;
}

function getPerspectiveResult(
  result: HistoryResult,
  playerColor: PlayerColor | null,
): PlayerHistoryRow['perspectiveResult'] {
  if (result === 'draw') return 'draw';
  if (result === 'unknown' || !playerColor) return 'unknown';
  if (result === playerColor) return 'win';
  return 'loss';
}

function getWinnerDisplayName(
  game: CompactHistoryGame,
  currentUserId: string,
  currentUserName: string,
): string | null {
  if (game.result === 'white') {
    return getPlayerDisplayName(game.whitePlayerId, currentUserId, currentUserName);
  }

  if (game.result === 'black') {
    return getPlayerDisplayName(game.blackPlayerId, currentUserId, currentUserName);
  }

  return null;
}

function formatHistoryDate(date: Date): string {
  return historyDateFormatter.format(date);
}

function toPlayerHistoryRow(
  game: CompactHistoryGame,
  currentUserId: string,
  currentUserName: string,
): PlayerHistoryRow {
  const playerColor = getPlayerColorForHistory(game, currentUserId);

  return {
    id: game.id,
    whitePlayerDisplayName: getPlayerDisplayName(game.whitePlayerId, currentUserId, currentUserName),
    blackPlayerDisplayName: getPlayerDisplayName(game.blackPlayerId, currentUserId, currentUserName),
    winnerDisplayName: getWinnerDisplayName(game, currentUserId, currentUserName),
    playerColor,
    perspectiveResult: getPerspectiveResult(game.result as HistoryResult, playerColor),
    result: game.result as HistoryResult,
    resultReason: game.resultReason as HistoryResultReason,
    finalFen: game.finalFen,
    endedAt: game.endedAt.toISOString(),
    displayDate: formatHistoryDate(game.endedAt),
  };
}

async function listPlayerHistoryRows(
  userId: string,
  cursor: PlayerHistoryCursor | null,
  limit: number,
) {
  return prisma.chessGame.findMany({
    where: {
      AND: [getScopedCompletedHistoryWhere(userId), getCursorWhere(cursor)],
    },
    orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: {
      id: true,
      userId: true,
      whitePlayerId: true,
      blackPlayerId: true,
      result: true,
      resultReason: true,
      finalFen: true,
      endedAt: true,
    },
  });
}

async function listAllPlayerHistoryResultRows(userId: string) {
  return prisma.chessGame.findMany({
    where: getScopedCompletedHistoryWhere(userId),
    orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      whitePlayerId: true,
      blackPlayerId: true,
      result: true,
      endedAt: true,
    },
  });
}

export function parsePlayerHistoryCursor(value: string | null): PlayerHistoryCursor | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'endedAt' in parsed &&
      'id' in parsed &&
      typeof parsed.endedAt === 'string' &&
      typeof parsed.id === 'string'
    ) {
      return { endedAt: parsed.endedAt, id: parsed.id };
    }
  } catch {
    return null;
  }

  return null;
}

export function encodePlayerHistoryCursor(cursor: PlayerHistoryCursor | null): string | null {
  if (!cursor) return null;

  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export async function getPlayerHistoryPage({
  userId,
  displayName,
  cursor,
  limit = PLAYER_HISTORY_PAGE_SIZE,
}: {
  userId: string;
  displayName: string;
  cursor: PlayerHistoryCursor | null;
  limit?: number;
}): Promise<PlayerHistoryPageData> {
  const pageSize = Math.min(Math.max(limit, 1), PLAYER_HISTORY_PAGE_SIZE);
  const [rows, resultRows] = await Promise.all([
    listPlayerHistoryRows(userId, cursor, pageSize),
    listAllPlayerHistoryResultRows(userId),
  ]);
  const visibleRows = rows.slice(0, pageSize);
  const hasMore = rows.length > pageSize;
  const nextCursorSource = hasMore ? visibleRows.at(-1) : null;
  const counts = resultRows.reduce(
    (summary, game) => {
      const playerColor = getPlayerColorForHistory(game as CompactHistoryGame, userId);
      const perspectiveResult = getPerspectiveResult(game.result as HistoryResult, playerColor);

      if (perspectiveResult === 'win') summary.wins += 1;
      if (perspectiveResult === 'loss') summary.losses += 1;
      if (perspectiveResult === 'draw') summary.draws += 1;

      return summary;
    },
    { wins: 0, losses: 0, draws: 0 },
  );

  return {
    overview: {
      displayName,
      totalGames: resultRows.length,
      wins: counts.wins,
      losses: counts.losses,
      draws: counts.draws,
      mostRecentGameDate: resultRows[0] ? formatHistoryDate(resultRows[0].endedAt) : null,
    },
    games: visibleRows.map((game) => toPlayerHistoryRow(game, userId, displayName)),
    nextCursor: nextCursorSource
      ? {
          endedAt: nextCursorSource.endedAt.toISOString(),
          id: nextCursorSource.id,
        }
      : null,
    hasMore,
  };
}

export async function getPlayerHistoryBatch({
  userId,
  displayName,
  cursor,
  limit = PLAYER_HISTORY_PAGE_SIZE,
}: {
  userId: string;
  displayName: string;
  cursor: PlayerHistoryCursor | null;
  limit?: number;
}): Promise<Pick<PlayerHistoryPageData, 'games' | 'nextCursor' | 'hasMore'>> {
  const pageSize = Math.min(Math.max(limit, 1), PLAYER_HISTORY_PAGE_SIZE);
  const rows = await listPlayerHistoryRows(userId, cursor, pageSize);
  const visibleRows = rows.slice(0, pageSize);
  const hasMore = rows.length > pageSize;
  const nextCursorSource = hasMore ? visibleRows.at(-1) : null;

  return {
    games: visibleRows.map((game) => toPlayerHistoryRow(game, userId, displayName)),
    nextCursor: nextCursorSource
      ? {
          endedAt: nextCursorSource.endedAt.toISOString(),
          id: nextCursorSource.id,
        }
      : null,
    hasMore,
  };
}

export async function getOwnedGameHistoryDetail(gameId: string, userId: string) {
  return prisma.chessGame.findFirst({
    where: {
      id: gameId,
      OR: [{ userId }, { whitePlayerId: userId }, { blackPlayerId: userId }],
    },
  });
}
