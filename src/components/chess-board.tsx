'use client';

import type { PlayerColor } from '@/types/game';

export interface BoardSquare {
  id: string;
  piece: string | null;
  pieceColor: PlayerColor | null;
  rank: number;
  fileIndex: number;
}

export const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export const pieceGlyphs: Record<string, string> = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

export function parseFenBoard(fen: string, perspective: PlayerColor): BoardSquare[] {
  const placement = fen.split(' ')[0] ?? '';
  const ranks = placement.split('/');

  const squares = ranks.flatMap((rankValue, rankIndex) => {
    const rank = 8 - rankIndex;
    const rankSquares: BoardSquare[] = [];
    let fileIndex = 0;

    for (const token of rankValue) {
      const emptyCount = Number(token);
      if (Number.isInteger(emptyCount) && emptyCount > 0) {
        for (let offset = 0; offset < emptyCount; offset += 1) {
          rankSquares.push({
            id: `${files[fileIndex]}${rank}`,
            piece: null,
            pieceColor: null,
            rank,
            fileIndex,
          });
          fileIndex += 1;
        }
        continue;
      }

      const pieceColor = token === token.toUpperCase() ? 'white' : 'black';

      rankSquares.push({
        id: `${files[fileIndex]}${rank}`,
        piece: pieceGlyphs[token] ?? null,
        pieceColor,
        rank,
        fileIndex,
      });
      fileIndex += 1;
    }

    return rankSquares;
  });

  return perspective === 'black' ? [...squares].reverse() : squares;
}

export function getPromotion(
  movingPiece: string | null | undefined,
  from: string,
  to: string,
): 'q' | undefined {
  if (movingPiece !== pieceGlyphs.P && movingPiece !== pieceGlyphs.p) {
    return undefined;
  }

  const fromRank = from.at(1);
  const targetRank = to.at(1);
  if ((fromRank === '7' && targetRank === '8') || (fromRank === '2' && targetRank === '1')) {
    return 'q';
  }
  return undefined;
}

export function ChessBoard({
  squares,
  perspective,
  selectedSquare,
  legalTargets,
  flashSquare,
  onSquareClick,
}: {
  squares: BoardSquare[];
  perspective: PlayerColor;
  selectedSquare: string | null;
  legalTargets: Set<string>;
  flashSquare: string | null;
  onSquareClick(squareId: string): void | Promise<void>;
}) {
  return (
    <div className="grid flex-1 place-items-center">
      <div className="grid aspect-square w-full max-w-[min(82vh,760px)] grid-cols-8 overflow-hidden rounded-2xl border border-border-subtle bg-elevated">
        {squares.map((square) => {
          const isDark = (square.rank + square.fileIndex) % 2 !== 0;
          const isSelected = selectedSquare === square.id;
          const isLegalTarget = legalTargets.has(square.id);
          const isFlashing = flashSquare === square.id;

          return (
            <button
              key={square.id}
              type="button"
              data-testid={`square-${square.id}`}
              onClick={() => onSquareClick(square.id)}
              className={[
                'relative aspect-square text-[clamp(1.5rem,6vw,4.5rem)] leading-none transition',
                isDark ? 'bg-subtle' : 'bg-elevated',
                isLegalTarget ? 'after:absolute after:left-1/2 after:top-1/2 after:size-3 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-brand sm:after:size-4' : '',
                isFlashing ? 'bg-error/40 ring-2 ring-inset ring-error' : '',
                isSelected ? 'ring-2 ring-inset ring-brand' : 'hover:bg-accent-dim',
              ].join(' ')}
              aria-label={square.piece ? `${square.piece} on ${square.id}` : square.id}
            >
              <span className="absolute left-1 top-1 font-mono text-[10px] text-copy-faint sm:text-xs">
                {square.fileIndex === (perspective === 'white' ? 0 : 7) ? square.rank : ''}
              </span>
              <span
                className={[
                  'drop-shadow',
                  square.pieceColor === 'black' ? 'text-ai-text' : 'text-copy-primary',
                ].join(' ')}
              >
                {square.piece}
              </span>
              <span className="absolute bottom-1 right-1 font-mono text-[10px] text-copy-faint sm:text-xs">
                {square.rank === (perspective === 'white' ? 1 : 8)
                  ? files[square.fileIndex]
                  : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
