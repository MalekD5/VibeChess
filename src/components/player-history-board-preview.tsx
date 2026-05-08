import type { PlayerColor } from '@/types/game';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

const pieceGlyphs: Record<string, string> = {
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

interface PreviewSquare {
  id: string;
  piece: string | null;
  pieceColor: PlayerColor | null;
  rank: number;
  fileIndex: number;
}

function parseFenPreview(fen: string | null): PreviewSquare[] | null {
  const placement = fen?.split(' ')[0];
  if (!placement) return null;

  const ranks = placement.split('/');
  if (ranks.length !== 8) return null;

  const squares: PreviewSquare[] = [];

  for (const [rankIndex, rankValue] of ranks.entries()) {
    const rank = 8 - rankIndex;
    let fileIndex = 0;

    for (const token of rankValue) {
      const emptyCount = Number(token);

      if (Number.isInteger(emptyCount) && emptyCount > 0) {
        for (let offset = 0; offset < emptyCount; offset += 1) {
          if (fileIndex >= files.length) return null;

          squares.push({
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

      if (!pieceGlyphs[token] || fileIndex >= files.length) return null;

      squares.push({
        id: `${files[fileIndex]}${rank}`,
        piece: pieceGlyphs[token],
        pieceColor: token === token.toUpperCase() ? 'white' : 'black',
        rank,
        fileIndex,
      });
      fileIndex += 1;
    }

    if (fileIndex !== files.length) return null;
  }

  return squares.length === 64 ? squares : null;
}

export function PlayerHistoryBoardPreview({ finalFen }: { finalFen: string | null }) {
  const squares = parseFenPreview(finalFen);

  if (!squares) {
    return (
      <div
        className="grid aspect-square size-28 shrink-0 place-items-center rounded-xl border border-border-subtle bg-elevated text-center text-[10px] font-medium uppercase tracking-wide text-copy-faint sm:size-32"
        aria-label="Final board unavailable"
      >
        Unavailable
      </div>
    );
  }

  return (
    <div
      className="grid aspect-square size-28 shrink-0 grid-cols-8 overflow-hidden rounded-xl border border-border-subtle bg-elevated sm:size-32"
      aria-label="Final board position"
      role="img"
    >
      {squares.map((square) => {
        const isDark = (square.rank + square.fileIndex) % 2 !== 0;

        return (
          <div
            key={square.id}
            className={[
              'grid aspect-square place-items-center text-[0.7rem] leading-none sm:text-sm',
              isDark ? 'bg-subtle' : 'bg-elevated',
              square.pieceColor === 'black' ? 'text-ai-text' : 'text-copy-primary',
            ].join(' ')}
            aria-hidden="true"
          >
            {square.piece}
          </div>
        );
      })}
    </div>
  );
}
