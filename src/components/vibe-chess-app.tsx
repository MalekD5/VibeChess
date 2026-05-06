'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameRealtimeProvider,
} from '@/hooks/game-realtime';
import type { GameState } from '@/types/game';
import { parseJsonResponse } from '@/lib/api-client';
import { PlayableGameScreen } from '@/components/playable-game-screen';

interface GameSetup {
  gameId: string;
  channelName: string;
  state: GameState;
}

interface CreateGameResponse {
  gameId: string;
  channelName: string;
  state: GameState;
}

interface JoinGameResponse {
  gameId: string;
  state: GameState;
}

export default function VibeChessApp() {
  const [gameSetup, setGameSetup] = useState<GameSetup | null>(null);
  const [joinGameId, setJoinGameId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialJoinAttemptRef = useRef(false);

  const loadGame = useCallback(async (nextGameId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/game/${encodeURIComponent(nextGameId)}`);
      const data = await parseJsonResponse<JoinGameResponse>(
        response,
        'Could not join game',
      );
      setGameSetup({
        gameId: data.gameId,
        channelName: `game:${data.gameId}`,
        state: data.state,
      });
      setJoinGameId(data.gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join game');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialJoinAttemptRef.current) return;
    initialJoinAttemptRef.current = true;

    const gameId = new URLSearchParams(window.location.search).get('game');
    if (!gameId) return;

    const timer = window.setTimeout(() => {
      void loadGame(gameId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadGame]);

  async function createGame(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/game', { method: 'POST' });
      const data = await parseJsonResponse<CreateGameResponse>(
        response,
        'Could not create game',
      );
      setGameSetup(data);
      setJoinGameId(data.gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create game');
    } finally {
      setIsLoading(false);
    }
  }

  async function joinExistingGame(): Promise<void> {
    const nextGameId = joinGameId.trim();
    if (!nextGameId) {
      setError('Enter a game ID to join');
      return;
    }

    await loadGame(nextGameId);
  }

  if (gameSetup) {
    return (
      <GameRealtimeProvider
        key={gameSetup.gameId}
        gameId={gameSetup.gameId}
        channelName={gameSetup.channelName}
        initialState={gameSetup.state}
      >
        <PlayableGameScreen onBackToStart={() => setGameSetup(null)} />
      </GameRealtimeProvider>
    );
  }

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-base/50">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wider text-brand">
            Realtime Chess
          </p>
          <h1 className="text-3xl font-semibold text-copy-primary">VibeChess</h1>
          <p className="text-sm text-copy-muted">
            Start a game, share the ID, and play from the live server state.
          </p>
        </div>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            onClick={createGame}
            disabled={isLoading}
            className="rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-copy-primary transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Working...' : 'New Game'}
          </button>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label htmlFor="join-game-id" className="sr-only">
              Existing game ID
            </label>
            <input
              id="join-game-id"
              value={joinGameId}
              onChange={(event) => setJoinGameId(event.target.value)}
              placeholder="Existing game ID"
              className="min-h-11 rounded-xl border border-border bg-elevated px-3 text-sm text-copy-primary outline-none transition placeholder:text-copy-faint focus:border-brand"
            />
            <button
              type="button"
              onClick={joinExistingGame}
              disabled={isLoading}
              className="rounded-xl border border-border-subtle bg-subtle px-4 py-3 text-sm font-medium text-copy-primary transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              Join Game
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
