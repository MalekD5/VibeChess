'use client';

import { useEffect, useRef } from 'react';
import type { GameState } from '@/types/game';

export function formatResult(state: GameState): string {
  if (!state.result) return 'Game finished';
  if (state.result.outcome === 'draw') {
    return state.result.reason === 'stalemate' ? 'Draw by stalemate' : 'Draw';
  }

  const winner = state.result.outcome === 'white_won' ? 'White' : 'Black';
  return `${winner} wins by ${state.result.reason}`;
}

export function GameResultModal({
  result,
  onClose,
  onNewGame,
}: {
  result: string;
  onClose(): void;
  onNewGame(): void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    firstActionRef.current?.focus();
    return () => {
      (previousFocusRef.current as HTMLElement | null)?.focus();
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-result-title"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 grid place-items-center bg-base/80 px-4 backdrop-blur-sm"
    >
      <section className="w-full max-w-sm rounded-3xl border border-border bg-elevated p-6 shadow-2xl shadow-base/60">
        <p className="font-mono text-xs uppercase tracking-wider text-brand">Game over</p>
        <h2 id="game-result-title" className="mt-2 text-2xl font-semibold text-copy-primary">{result}</h2>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            ref={firstActionRef}
            type="button"
            onClick={onNewGame}
            className="rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-copy-primary transition hover:bg-brand/90"
          >
            New game
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border-subtle bg-subtle px-4 py-3 text-sm font-medium text-copy-primary transition hover:border-brand"
          >
            Review board
          </button>
        </div>
      </section>
    </div>
  );
}
