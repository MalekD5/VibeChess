'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameRealtimeSession } from '@/hooks/game-realtime';
import type { PlayerColor } from '@/types/game';
import { parseFenBoard } from '@/components/chess-board';
import { ChessBoard } from '@/components/chess-board';
import { GameResultModal, formatResult } from '@/components/game-result-modal';
import { GameSidebar } from '@/components/game-sidebar';
import { useBoardInteraction } from '@/hooks/use-board-interaction';

function formatStatus(state: { status: string; currentTurn: PlayerColor }): string {
  if (state.status === 'waiting') return 'Waiting for both colors to join';
  if (state.status === 'finished') return 'Game finished';
  return `${state.currentTurn === 'white' ? 'White' : 'Black'} to move`;
}

function formatShortGameId(gameId: string): string {
  return `${gameId.slice(0, 8)}…${gameId.slice(-4)}`;
}

export function PlayableGameScreen({ onBackToStart }: { onBackToStart: () => void }) {
  const session = useGameRealtimeSession();
  const state = session.state;
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const autoJoinAttemptRef = useRef<string | null>(null);
  const [autoJoinInFlight, setAutoJoinInFlight] = useState(false);
  const [manualJoinColor, setManualJoinColor] = useState<PlayerColor | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const manualJoinTimeoutRef = useRef<number | null>(null);

  const seatedColor = useMemo<PlayerColor | null>(() => {
    if (state?.players.white?.id === session.playerId) return 'white';
    if (state?.players.black?.id === session.playerId) return 'black';
    return null;
  }, [session.playerId, state?.players.black?.id, state?.players.white?.id]);

  const autoJoinColor = useMemo<PlayerColor | null>(() => {
    if (!state || state.status !== 'waiting' || seatedColor !== null) return null;
    const whiteOpen = state.players.white === null;
    const blackOpen = state.players.black === null;
    if (whiteOpen === blackOpen) return null;
    return whiteOpen ? 'white' : 'black';
  }, [seatedColor, state]);

  const perspective = seatedColor ?? 'white';
  const boardSquares = useMemo(
    () => (state ? parseFenBoard(state.fen, perspective) : []),
    [perspective, state],
  );
  const squareById = useMemo(
    () => new Map(boardSquares.map((sq) => [sq.id, sq])),
    [boardSquares],
  );
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/?game=${encodeURIComponent(session.gameId)}`;
  }, [session.gameId]);

  const runAction = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    try {
      await action();
      setActionError(null);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed';
      setActionError(message);
      console.warn(message);
      return false;
    }
  }, []);

  const handleManualJoin = useCallback(
    async (color: PlayerColor): Promise<void> => {
      if (manualJoinColor !== null) return;

      setManualJoinColor(color);
      const sent = await runAction(() => session.joinGame(color));

      if (!sent) {
        setManualJoinColor(null);
        return;
      }

      if (manualJoinTimeoutRef.current !== null) {
        window.clearTimeout(manualJoinTimeoutRef.current);
      }

      manualJoinTimeoutRef.current = window.setTimeout(() => {
        setManualJoinColor(null);
        setActionError('Seat request was sent, but no server state update arrived.');
        manualJoinTimeoutRef.current = null;
      }, 5000);
    },
    [manualJoinColor, runAction, session],
  );

  const { selectedSquare, legalTargets, flashSquare, isSending, handleSquareClick } =
    useBoardInteraction({
      state,
      seatedColor,
      squareById,
      gameId: session.gameId,
      makeMove: session.makeMove,
    });

  useEffect(() => {
    if (!state || autoJoinColor === null) return;

    const attemptKey = `${state.gameId}:${autoJoinColor}`;
    if (autoJoinAttemptRef.current === attemptKey) return;

    autoJoinAttemptRef.current = attemptKey;
    setAutoJoinInFlight(true);
    const joinAttempt = session.joinGame(autoJoinColor);
    void runAction(() => joinAttempt);
    void joinAttempt.then(
      () => setAutoJoinInFlight(false),
      (err) => {
        if (autoJoinAttemptRef.current === attemptKey) {
          autoJoinAttemptRef.current = null;
        }
        setAutoJoinInFlight(false);
        console.warn('Auto-join failed', err);
      },
    );
  }, [autoJoinColor, runAction, session, state]);

  useEffect(() => {
    if (state?.status !== 'finished') return;
    const timer = window.setTimeout(() => setResultModalOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [state?.status]);

  useEffect(() => {
    if (manualJoinColor === null) return;
    if (seatedColor === null && state?.players[manualJoinColor] === null) return;

    const timer = window.setTimeout(() => {
      if (manualJoinTimeoutRef.current !== null) {
        window.clearTimeout(manualJoinTimeoutRef.current);
        manualJoinTimeoutRef.current = null;
      }
      setManualJoinColor(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [manualJoinColor, seatedColor, state?.players]);

  useEffect(() => {
    return () => {
      if (manualJoinTimeoutRef.current !== null) {
        window.clearTimeout(manualJoinTimeoutRef.current);
      }
    };
  }, []);

  if (!state) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center px-4">
        <p aria-live="polite" className="text-sm text-copy-muted">
          Connecting to game…
        </p>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-1 flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl flex-1 min-h-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-border bg-surface p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-brand">
                Game {formatShortGameId(session.gameId)}
              </p>
              <h1 className="text-xl font-semibold text-copy-primary">
                {formatStatus(state)}
              </h1>
            </div>
            <button
              type="button"
              onClick={onBackToStart}
              className="rounded-xl border border-border-subtle bg-elevated px-3 py-2 text-sm text-copy-secondary transition hover:border-brand hover:text-copy-primary focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none"
            >
              New Game
            </button>
          </div>
          {actionError ? (
            <p
              aria-live="polite"
              className="mb-4 rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
            >
              {actionError}
            </p>
          ) : null}

          <ChessBoard
            squares={boardSquares}
            perspective={perspective}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            flashSquare={flashSquare}
            onSquareClick={handleSquareClick}
          />
        </section>

        <GameSidebar
          state={state}
          gameId={session.gameId}
          playerId={session.playerId}
          connectionStatus={session.connectionStatus}
          seatedColor={seatedColor}
          autoJoinColor={autoJoinColor}
          autoJoinInFlight={autoJoinInFlight}
          manualJoinColor={manualJoinColor}
          isSending={isSending}
          shareUrl={shareUrl}
          onJoin={(color) => void handleManualJoin(color)}
          onResign={() => void runAction(() => session.resign())}
        />
      </div>

      {resultModalOpen && state.status === 'finished' ? (
        <GameResultModal
          result={formatResult(state)}
          onClose={() => setResultModalOpen(false)}
          onNewGame={onBackToStart}
        />
      ) : null}
    </main>
  );
}
