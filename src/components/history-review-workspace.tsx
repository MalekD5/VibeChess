'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { files, parseFenBoard } from '@/components/chess-board';
import type { HistoryReviewGame, HistoryReviewMove } from '@/types/player-history';

function formatResult(review: HistoryReviewGame): string {
  if (review.result === 'draw') return 'Draw';
  if (review.result === 'white') return `${review.whitePlayerDisplayName} won`;
  if (review.result === 'black') return `${review.blackPlayerDisplayName} won`;
  return 'Unknown result';
}

function formatReason(reason: HistoryReviewGame['resultReason']): string {
  if (reason === 'unknown') return 'Reason unknown';
  return reason.replace('-', ' ');
}

function groupMoves(moves: HistoryReviewMove[]) {
  const groups = new Map<number, { moveNumber: number; white: HistoryReviewMove | null; black: HistoryReviewMove | null }>();

  for (const move of moves) {
    const group = groups.get(move.moveNumber) ?? {
      moveNumber: move.moveNumber,
      white: null,
      black: null,
    };

    if (move.color === 'white') {
      group.white = move;
    } else {
      group.black = move;
    }

    groups.set(move.moveNumber, group);
  }

  return [...groups.values()];
}

function ReviewBoard({
  fen,
  selectedMove,
  perspective,
}: {
  fen: string;
  selectedMove: HistoryReviewMove | null;
  perspective: HistoryReviewGame['playerColor'];
}) {
  const boardPerspective = perspective ?? 'white';
  const squares = useMemo(() => parseFenBoard(fen, boardPerspective), [boardPerspective, fen]);
  const highlightedSquares = useMemo(() => {
    if (!selectedMove?.from || !selectedMove.to) return new Set<string>();
    return new Set([selectedMove.from, selectedMove.to]);
  }, [selectedMove]);

  return (
    <div className="grid min-h-0 place-items-center">
      <div
        className="grid aspect-square w-full max-w-[min(100%,calc(100dvh-12rem),720px)] grid-cols-8 overflow-hidden rounded-2xl border border-border-subtle bg-elevated"
        role="img"
        aria-label={`Board position after ${selectedMove ? selectedMove.san : 'the initial setup'}`}
      >
        {squares.map((square) => {
          const isDark = (square.rank + square.fileIndex) % 2 !== 0;
          const isHighlighted = highlightedSquares.has(square.id);

          return (
            <div
              key={square.id}
              className={[
                'relative grid aspect-square place-items-center text-3xl leading-none sm:text-5xl lg:text-6xl',
                isDark ? 'bg-subtle' : 'bg-elevated',
                isHighlighted ? 'ring-2 ring-inset ring-brand' : '',
              ].join(' ')}
              aria-hidden="true"
            >
              <span className="absolute left-1 top-1 font-mono text-[10px] text-copy-faint sm:text-xs">
                {square.fileIndex === (boardPerspective === 'white' ? 0 : 7) ? square.rank : ''}
              </span>
              <span className={square.pieceColor === 'black' ? 'text-ai-text drop-shadow' : 'text-copy-primary drop-shadow'}>
                {square.piece}
              </span>
              <span className="absolute bottom-1 right-1 font-mono text-[10px] text-copy-faint sm:text-xs">
                {square.rank === (boardPerspective === 'white' ? 1 : 8) ? files[square.fileIndex] : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MoveButton({
  move,
  selectedPly,
  onSelect,
}: {
  move: HistoryReviewMove | null;
  selectedPly: number;
  onSelect(ply: number): void;
}) {
  if (!move) {
    return <span className="min-w-0 rounded-xl px-2 py-2 text-sm text-copy-faint">No move</span>;
  }

  const isSelected = selectedPly === move.ply;

  return (
    <button
      type="button"
      onClick={() => onSelect(move.ply)}
      className={[
        'min-w-0 rounded-xl px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-accent-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        isSelected ? 'bg-accent-dim text-brand' : 'text-copy-secondary',
      ].join(' ')}
      aria-current={isSelected ? 'step' : undefined}
    >
      <span className="block truncate">{move.san}</span>
    </button>
  );
}

export function HistoryReviewWorkspace({ review }: { review: HistoryReviewGame }) {
  const [selectedPly, setSelectedPly] = useState(0);
  const selectedPosition = review.positions[selectedPly] ?? review.positions[0];
  const moveGroups = useMemo(() => groupMoves(review.moves), [review.moves]);
  const finalPly = review.positions.length - 1;
  const canGoBack = selectedPly > 0;
  const canGoForward = selectedPly < finalPly;

  function selectPly(nextPly: number) {
    setSelectedPly(Math.min(Math.max(nextPly, 0), finalPly));
  }

  return (
    <section
      className="grid gap-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:grid-cols-[minmax(0,1fr)_22rem]"
      aria-label="Game Review"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          selectPly(selectedPly - 1);
        }

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          selectPly(selectedPly + 1);
        }
      }}
    >
      <div className="min-w-0 rounded-2xl border border-border bg-surface p-3 focus-within:border-border-subtle sm:p-4">
        <ReviewBoard fen={selectedPosition.fen} selectedMove={selectedPosition.move} perspective={review.playerColor} />
      </div>

      <aside className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-4" aria-labelledby="review-summary-title">
          <h2 id="review-summary-title" className="text-sm font-semibold uppercase text-copy-muted">
            Game Summary
          </h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-copy-faint">Matchup</dt>
              <dd className="min-w-0 break-words font-semibold text-copy-primary">
                {review.whitePlayerDisplayName} vs {review.blackPlayerDisplayName}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-copy-faint">Result</dt>
                <dd className="font-semibold text-brand">{formatResult(review)}</dd>
              </div>
              <div>
                <dt className="text-copy-faint">Reason</dt>
                <dd className="capitalize text-copy-secondary">{formatReason(review.resultReason)}</dd>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-copy-faint">Ended</dt>
                <dd className="text-copy-secondary">{review.displayEndedAt}</dd>
              </div>
              <div>
                <dt className="text-copy-faint">Ply</dt>
                <dd className="font-mono text-copy-secondary">{review.plyCount}</dd>
              </div>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-surface" aria-labelledby="review-controls-title">
          <div className="border-b border-border px-4 py-3">
            <h2 id="review-controls-title" className="text-sm font-semibold uppercase text-copy-muted">
              Move Review
            </h2>
            <p className="mt-1 min-w-0 truncate text-sm text-copy-secondary">
              {selectedPosition.move
                ? `${selectedPosition.move.moveNumber}. ${selectedPosition.move.san}`
                : 'Start position'}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 border-b border-border p-3">
            <button
              type="button"
              onClick={() => selectPly(0)}
              disabled={!canGoBack}
              aria-label="Go to start"
              className="grid min-h-11 place-items-center rounded-xl border border-border bg-elevated text-copy-primary transition-colors hover:bg-accent-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-copy-faint disabled:hover:bg-elevated"
            >
              <ChevronsLeft aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              onClick={() => selectPly(selectedPly - 1)}
              disabled={!canGoBack}
              aria-label="Previous move"
              className="grid min-h-11 place-items-center rounded-xl border border-border bg-elevated text-copy-primary transition-colors hover:bg-accent-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-copy-faint disabled:hover:bg-elevated"
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              onClick={() => selectPly(selectedPly + 1)}
              disabled={!canGoForward}
              aria-label="Next move"
              className="grid min-h-11 place-items-center rounded-xl border border-border bg-elevated text-copy-primary transition-colors hover:bg-accent-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-copy-faint disabled:hover:bg-elevated"
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
            <button
              type="button"
              onClick={() => selectPly(finalPly)}
              disabled={!canGoForward}
              aria-label="Go to final position"
              className="grid min-h-11 place-items-center rounded-xl border border-border bg-elevated text-copy-primary transition-colors hover:bg-accent-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-copy-faint disabled:hover:bg-elevated"
            >
              <ChevronsRight aria-hidden="true" size={18} />
            </button>
          </div>

          <ol className="max-h-[28rem] overflow-y-auto p-3">
            {moveGroups.length === 0 ? (
              <li className="rounded-xl bg-elevated px-3 py-3 text-sm text-copy-muted">
                No moves were recorded.
              </li>
            ) : (
              moveGroups.map((group) => (
                <li key={group.moveNumber} className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                  <span className="font-mono text-xs text-copy-faint">{group.moveNumber}.</span>
                  <MoveButton move={group.white} selectedPly={selectedPly} onSelect={selectPly} />
                  <MoveButton move={group.black} selectedPly={selectedPly} onSelect={selectPly} />
                </li>
              ))
            )}
          </ol>
        </section>
      </aside>
    </section>
  );
}
