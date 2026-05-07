import { Chess, type Color } from 'chess.js';
import { getAllLegalMoves, type LegalMove } from '@/engine/chess-engine';
import type { AiDifficulty, MoveInput } from '@/types/game';

const pieceValues = {
  p: 100,
  n: 300,
  b: 300,
  r: 500,
  q: 900,
  k: 0,
} as const;

function randomMove(moves: LegalMove[]): LegalMove | null {
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)] ?? null;
}

function toMoveInput(move: LegalMove): MoveInput {
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  };
}

function materialScore(fen: string, aiColor: Color): number {
  const chess = new Chess(fen);

  if (chess.isCheckmate()) {
    return chess.turn() === aiColor ? -100000 : 100000;
  }

  if (chess.isDraw() || chess.isStalemate()) {
    return 0;
  }

  return chess.board().flat().reduce((score, piece) => {
    if (!piece) return score;
    const value = pieceValues[piece.type];
    return piece.color === aiColor ? score + value : score - value;
  }, 0);
}

function stableMoveKey(move: LegalMove): string {
  return `${move.from}${move.to}${move.promotion ?? ''}${move.san}`;
}

function selectMediumMove(moves: LegalMove[]): LegalMove | null {
  return (
    randomMove(moves.filter((move) => move.isCapture)) ??
    randomMove(moves.filter((move) => move.isCheck)) ??
    randomMove(moves.filter((move) => move.isPromotion)) ??
    randomMove(moves)
  );
}

function selectHardMove(fen: string, moves: LegalMove[]): LegalMove | null {
  const aiColor = new Chess(fen).turn();
  const candidates = [...moves].sort((a, b) =>
    stableMoveKey(a).localeCompare(stableMoveKey(b)),
  );

  let bestMove: LegalMove | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of candidates) {
    const next = new Chess(fen);
    next.move(toMoveInput(move));
    const score = materialScore(next.fen(), aiColor);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

export function selectAiMove(fen: string, difficulty: AiDifficulty): MoveInput | null {
  const moves = getAllLegalMoves(fen);

  const selected =
    difficulty === 'easy'
      ? randomMove(moves)
      : difficulty === 'medium'
        ? selectMediumMove(moves)
        : selectHardMove(fen, moves);

  return selected ? toMoveInput(selected) : null;
}
