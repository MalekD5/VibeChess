'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameRealtimeProvider,
} from '@/hooks/game-realtime';
import type { AiDifficulty, GameState, PlayerColor } from '@/types/game';
import { parseJsonResponse } from '@/lib/api-client';
import { signOut } from '@/lib/auth-client';
import type { CurrentUser } from '@/lib/session';
import { PlayableGameScreen } from '@/components/playable-game-screen';

type GameMode = 'human' | 'ai';

interface GameSetup {
  gameId: string;
  channelName: string;
  state: GameState;
  playerId?: string;
}

interface CreateGameResponse {
  gameId: string;
  channelName: string;
  state: GameState;
  playerId?: string;
}

interface JoinGameResponse {
  gameId: string;
  state: GameState;
}

interface VibeChessAppProps {
  currentUser: CurrentUser;
}

export default function VibeChessApp({ currentUser }: VibeChessAppProps) {
  const [gameSetup, setGameSetup] = useState<GameSetup | null>(null);
  const [joinGameId, setJoinGameId] = useState('');
  const [gameMode, setGameMode] = useState<GameMode>('human');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('medium');
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
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: gameMode === 'ai' ? { 'Content-Type': 'application/json' } : undefined,
        body:
          gameMode === 'ai'
            ? JSON.stringify({
                mode: 'ai',
                playerColor,
                aiDifficulty,
              })
            : undefined,
      });
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

  async function handleSignOut(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      await signOut();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign out');
      setIsLoading(false);
    }
  }

  if (gameSetup) {
    return (
      <GameRealtimeProvider
        key={gameSetup.gameId}
        gameId={gameSetup.gameId}
        channelName={gameSetup.channelName}
        initialState={gameSetup.state}
        initialPlayerId={gameSetup.playerId}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-copy-primary">VibeChess</h1>
              <p className="text-sm text-copy-muted">
                Start a game, share the ID, and play from the live server state.
              </p>
              <p className="text-xs text-copy-faint">
                Signed in as {currentUser.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isLoading}
              className="rounded-xl border border-border-subtle bg-subtle px-3 py-2 text-sm font-medium text-copy-secondary transition hover:border-brand hover:text-copy-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          <div className="grid gap-2">
            <span className="text-xs font-medium uppercase text-copy-muted">
              Mode
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['human', 'ai'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGameMode(mode)}
                  disabled={isLoading}
                  aria-pressed={gameMode === mode}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    gameMode === mode
                      ? mode === 'ai'
                        ? 'border-ai bg-ai/15 text-ai-text'
                        : 'border-brand bg-accent-dim text-copy-primary'
                      : 'border-border bg-elevated text-copy-secondary hover:border-brand hover:text-copy-primary'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {gameMode === 'ai' ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <span className="text-xs font-medium uppercase text-copy-muted">
                  Your color
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['white', 'black'] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPlayerColor(color)}
                      disabled={isLoading}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        playerColor === color
                          ? 'border-brand bg-accent-dim text-copy-primary'
                          : 'border-border-subtle bg-subtle text-copy-secondary hover:border-brand hover:text-copy-primary'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <span className="text-xs font-medium uppercase text-copy-muted">
                  Difficulty
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                    <button
                      key={difficulty}
                      type="button"
                      onClick={() => setAiDifficulty(difficulty)}
                      disabled={isLoading}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        aiDifficulty === difficulty
                          ? 'border-ai bg-ai/15 text-ai-text'
                          : 'border-border-subtle bg-subtle text-copy-secondary hover:border-ai hover:text-copy-primary'
                      }`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

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
