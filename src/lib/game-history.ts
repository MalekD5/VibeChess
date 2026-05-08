import { prisma } from '@/lib/prisma';
import type { Prisma } from '../../generated/prisma/client';
import type {
  CanonicalGameEvent,
  GameState,
  HistoryResult,
  HistoryResultReason,
} from '@/types/game';

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

export async function getOwnedGameHistoryDetail(gameId: string, userId: string) {
  return prisma.chessGame.findFirst({
    where: {
      id: gameId,
      OR: [{ userId }, { whitePlayerId: userId }, { blackPlayerId: userId }],
    },
  });
}

