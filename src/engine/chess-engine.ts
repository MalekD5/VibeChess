import { Chess, type Move as ChessMove, type Square } from 'chess.js';
import { STANDARD_INITIAL_FEN } from '@/types/game';
import type { MoveInput, MoveGameEvent } from '@/types/game';

export interface MoveResult {
  fen: string;
  san: string;
  uci: string;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

export interface LegalMove {
  from: string;
  to: string;
  san: string;
  promotion?: string;
  isCapture: boolean;
  isEnPassant: boolean;
  isCheck: boolean;
  isPromotion: boolean;
}

export function getInitialFen(): string {
  return STANDARD_INITIAL_FEN;
}

function toLegalMove(move: ChessMove): LegalMove {
  return {
    from: move.from,
    to: move.to,
    san: move.san,
    promotion: move.promotion,
    isCapture: move.isCapture(),
    isEnPassant: move.isEnPassant(),
    isCheck: new Chess(move.after).isCheck(),
    isPromotion: move.isPromotion(),
  };
}

export function getLegalMoves(fen: string, from: string): LegalMove[] {
  try {
    const chess = new Chess(fen);
    return chess.moves({ square: from as Square, verbose: true }).map(toLegalMove);
  } catch {
    return [];
  }
}

export function getAllLegalMoves(fen: string): LegalMove[] {
  try {
    return new Chess(fen).moves({ verbose: true }).map(toLegalMove);
  } catch {
    return [];
  }
}

export function isLegalMove(fen: string, move: MoveInput): boolean {
  try {
    const chess = new Chess(fen);
    const result = chess.move(move);
    return result !== null;
  } catch {
    return false;
  }
}

export function validateAndApplyMove(fen: string, move: MoveInput): MoveResult | null {
  try {
    const chess = new Chess(fen);
    const result = chess.move(move);
    if (!result) return null;
    return {
      fen: chess.fen(),
      san: result.san,
      uci: `${result.from}${result.to}${result.promotion ?? ''}`,
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
    };
  } catch {
    return null;
  }
}

export function buildMoveEventsFromSanHistory(
  gameId: string,
  initialFen: string,
  moveHistory: string[],
  players: { white?: { id: string } | null; black?: { id: string } | null },
  createdAt: number,
): MoveGameEvent[] {
  try {
    const chess = new Chess(initialFen);

    return moveHistory.map((san, index) => {
      const move = chess.move(san);
      const color = index % 2 === 0 ? 'white' : 'black';
      const playerId = players[color]?.id ?? color;
      const seq = index + 1;

      return {
        id: `${gameId}:${seq}`,
        gameId,
        seq,
        type: 'move',
        actorId: playerId,
        createdAt: new Date(createdAt).toISOString(),
        schemaVersion: 1,
        ply: seq,
        playerId,
        uci: `${move.from}${move.to}${move.promotion ?? ''}`,
        san: move.san,
        fenAfter: chess.fen(),
      };
    });
  } catch {
    return [];
  }
}
