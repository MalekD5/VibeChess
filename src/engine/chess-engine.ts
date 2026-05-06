import { Chess, type Square } from 'chess.js';
import type { MoveInput } from '@/types/game';

export interface MoveResult {
  fen: string;
  san: string;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}

export interface LegalMove {
  from: string;
  to: string;
  san: string;
  promotion?: string;
}

export function getInitialFen(): string {
  return new Chess().fen();
}

export function getLegalMoves(fen: string, from: string): LegalMove[] {
  try {
    const chess = new Chess(fen);
    return chess.moves({ square: from as Square, verbose: true }).map((move) => ({
      from: move.from,
      to: move.to,
      san: move.san,
      promotion: move.promotion,
    }));
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
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
    };
  } catch {
    return null;
  }
}
