'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GameRealtimeProvider,
  useGameRealtimeSession,
} from '@/hooks/game-realtime';
import type { GameState, PlayerColor } from '@/types/game';

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

interface LegalMove {
  from: string;
  to: string;
  san: string;
  promotion?: string;
}

interface LegalMovesResponse {
  moves: LegalMove[];
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

interface BoardSquare {
  id: string;
  piece: string | null;
  pieceColor: PlayerColor | null;
  rank: number;
  fileIndex: number;
}

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

function getApiError(data: unknown, fallback: string): string {
  if (typeof data !== 'object' || data === null) return fallback;
  const body = data as ApiErrorResponse;
  return body.message ?? body.error ?? fallback;
}

async function parseJsonResponse<T>(response: Response, fallback: string): Promise<T> {
  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getApiError(data, fallback));
  }

  return data as T;
}

function parseFenBoard(fen: string, perspective: PlayerColor): BoardSquare[] {
  const placement = fen.split(' ')[0] ?? '';
  const ranks = placement.split('/');

  const squares = ranks.flatMap((rankValue, rankIndex) => {
    const rank = 8 - rankIndex;
    const squares: BoardSquare[] = [];
    let fileIndex = 0;

    for (const token of rankValue) {
      const emptyCount = Number(token);
      if (Number.isInteger(emptyCount) && emptyCount > 0) {
        for (let offset = 0; offset < emptyCount; offset += 1) {
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

      const pieceColor = token === token.toUpperCase() ? 'white' : 'black';

      squares.push({
        id: `${files[fileIndex]}${rank}`,
        piece: pieceGlyphs[token] ?? null,
        pieceColor,
        rank,
        fileIndex,
      });
      fileIndex += 1;
    }

    return squares;
  });

  return perspective === 'black' ? [...squares].reverse() : squares;
}

function formatStatus(state: GameState): string {
  if (state.status === 'waiting') return 'Waiting for both colors to join';
  if (state.status === 'finished') return 'Game finished';
  return `${state.currentTurn === 'white' ? 'White' : 'Black'} to move`;
}

function formatPlayerLabel(state: GameState, color: PlayerColor, playerId: string): string {
  const player = state.players[color];
  if (!player) return 'Open';
  return player.id === playerId ? 'You' : 'Joined';
}

function formatShortGameId(gameId: string): string {
  return `${gameId.slice(0, 8)}...${gameId.slice(-4)}`;
}

function formatResult(state: GameState): string {
  if (!state.result) return 'Game finished';
  if (state.result.outcome === 'draw') {
    return state.result.reason === 'stalemate' ? 'Draw by stalemate' : 'Draw';
  }

  const winner = state.result.outcome === 'white_won' ? 'White' : 'Black';
  return `${winner} wins by ${state.result.reason}`;
}

function getPromotion(
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

function copyTextWithTextarea(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

async function copyTextToClipboard(text: string): Promise<void> {
  try {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API is unavailable');
    }

    await navigator.clipboard.writeText(text);
    return;
  } catch (err) {
    console.error('Clipboard API copy failed', err);
  }

  if (!copyTextWithTextarea(text)) {
    throw new Error('Fallback copy failed');
  }
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

function PlayableGameScreen({ onBackToStart }: { onBackToStart: () => void }) {
  const session = useGameRealtimeSession();
  const state = session.state;
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<Set<string>>(() => new Set());
  const [flashSquare, setFlashSquare] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCopyError, setShareCopyError] = useState<string | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isMoveInFlight = useRef(false);
  const autoJoinAttemptRef = useRef<string | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

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
  }, [
    seatedColor,
    state,
  ]);

  const perspective = seatedColor ?? 'white';
  const boardSquares = useMemo(
    () => (state ? parseFenBoard(state.fen, perspective) : []),
    [perspective, state],
  );
  const squareById = useMemo(
    () => new Map(boardSquares.map((square) => [square.id, square])),
    [boardSquares],
  );
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/?game=${encodeURIComponent(session.gameId)}`;
  }, [session.gameId]);

  const runAction = useCallback(async (action: () => Promise<void>): Promise<void> => {
    setIsSending(true);

    try {
      await action();
    } catch (err) {
      console.warn(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSending(false);
    }
  }, []);

  const flashInvalidSquare = useCallback((squareId: string): void => {
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
    }

    setFlashSquare(squareId);
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashSquare(null);
      flashTimeoutRef.current = null;
    }, 450);
  }, []);

  async function fetchLegalTargets(from: string): Promise<Set<string>> {
    const response = await fetch(
      `/api/game/${encodeURIComponent(session.gameId)}/legal-moves?from=${encodeURIComponent(from)}`,
    );
    const data = await parseJsonResponse<LegalMovesResponse>(
      response,
      'Could not load legal moves',
    );
    return new Set(data.moves.map((move) => move.to));
  }

  useEffect(() => {
    if (!state || autoJoinColor === null) return;

    const attemptKey = `${state.gameId}:${autoJoinColor}`;
    if (autoJoinAttemptRef.current === attemptKey) return;

    autoJoinAttemptRef.current = attemptKey;
    const joinAttempt = session.joinGame(autoJoinColor);
    void runAction(() => joinAttempt);
    void joinAttempt.catch((err) => {
      if (autoJoinAttemptRef.current === attemptKey) {
        autoJoinAttemptRef.current = null;
      }
      console.warn('Auto-join failed', err);
    });
  }, [autoJoinColor, runAction, session, state]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedSquare(null);
      setLegalTargets(new Set());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [state?.currentTurn, state?.fen, state?.status]);

  useEffect(() => {
    if (state?.status !== 'finished') return;

    const timer = window.setTimeout(() => {
      setResultModalOpen(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [state?.status]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  if (!state) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center px-4">
        <p className="text-sm text-copy-muted">Connecting to game...</p>
      </main>
    );
  }

  async function handleSquareClick(squareId: string): Promise<void> {
    if (isMoveInFlight.current) return;
    if (!state) return;

    if (state.status !== 'active') {
      flashInvalidSquare(squareId);
      return;
    }

    if (seatedColor !== state.currentTurn) {
      flashInvalidSquare(squareId);
      return;
    }

    const square = squareById.get(squareId);

    if (!selectedSquare) {
      if (!square?.piece || square.pieceColor !== seatedColor) {
        flashInvalidSquare(squareId);
        return;
      }

      setSelectedSquare(squareId);
      try {
        setLegalTargets(await fetchLegalTargets(squareId));
      } catch {
        setLegalTargets(new Set());
        flashInvalidSquare(squareId);
      }
      return;
    }

    if (selectedSquare === squareId) {
      setSelectedSquare(null);
      setLegalTargets(new Set());
      return;
    }

    if (square?.piece && square.pieceColor === seatedColor) {
      setSelectedSquare(squareId);
      try {
        setLegalTargets(await fetchLegalTargets(squareId));
      } catch {
        setLegalTargets(new Set());
        flashInvalidSquare(squareId);
      }
      return;
    }

    if (!legalTargets.has(squareId)) {
      flashInvalidSquare(squareId);
      return;
    }

    const from = selectedSquare;
    const to = squareId;
    setSelectedSquare(null);
    setLegalTargets(new Set());
    isMoveInFlight.current = true;
    setIsSending(true);
    void session
      .makeMove({
        from,
        to,
        promotion: getPromotion(squareById.get(from)?.piece, from, to),
      })
      .catch(() => flashInvalidSquare(to))
      .finally(() => {
        isMoveInFlight.current = false;
        setIsSending(false);
      });
  }

  async function handleCopyShareUrl(): Promise<void> {
    setShareCopyError(null);

    try {
      await copyTextToClipboard(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1200);
    } catch (err) {
      console.error('Could not copy share link', err);
      setShareCopied(false);
      setShareCopyError('Could not copy link. Select the URL and copy it manually.');
    }
  }

  return (
    <main className="flex min-h-dvh flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-3 sm:p-4">
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
              className="rounded-xl border border-border-subtle bg-elevated px-3 py-2 text-sm text-copy-secondary transition hover:border-brand hover:text-copy-primary"
            >
              New game
            </button>
          </div>

          <ChessBoard
            squares={boardSquares}
            perspective={perspective}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            flashSquare={flashSquare}
            onSquareClick={handleSquareClick}
          />
        </section>

        <aside className="grid content-start gap-4">
          <Panel title="Session">
            <dl className="grid gap-3 text-sm">
              <InfoRow label="Game" value={formatShortGameId(session.gameId)} isMono />
              <InfoRow label="Connection" value={session.connectionStatus} />
              <InfoRow label="Status" value={state.status} />
              <InfoRow
                label="Current turn"
                value={state.currentTurn === 'white' ? 'White' : 'Black'}
              />
              <InfoRow label="Your seat" value={seatedColor ?? 'Observer'} />
            </dl>
          </Panel>

          <Panel title="Share">
            <div className="grid gap-3">
              <input
                readOnly
                value={shareUrl}
                className="min-h-10 rounded-xl border border-border bg-elevated px-3 font-mono text-xs text-copy-muted outline-none"
              />
              <button
                type="button"
                onClick={() => void handleCopyShareUrl()}
                className="rounded-xl border border-border-subtle bg-subtle px-3 py-2 text-sm font-medium text-copy-primary transition hover:border-brand"
              >
                {shareCopied ? 'Copied' : 'Copy share link'}
              </button>
              {shareCopyError ? (
                <p className="rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
                  {shareCopyError}
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel title="Players">
            <div className="grid gap-2">
              {(['white', 'black'] as const).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => void runAction(() => session.joinGame(color))}
                  disabled={
                    state.status !== 'waiting' ||
                    state.players[color] !== null ||
                    seatedColor !== null ||
                    autoJoinColor !== null ||
                    isSending
                  }
                  className="flex items-center justify-between rounded-xl border border-border bg-elevated px-3 py-3 text-sm transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="font-medium capitalize text-copy-primary">{color}</span>
                  <span className="text-copy-muted">
                    {formatPlayerLabel(state, color, session.playerId)}
                  </span>
                </button>
              ))}
            </div>
            {autoJoinColor ? (
              <p className="mt-3 text-xs text-copy-muted">
                Joining the open {autoJoinColor} seat...
              </p>
            ) : null}
          </Panel>

          <Panel title="Moves">
            {state.moveHistory.length > 0 ? (
              <ol className="grid max-h-56 gap-2 overflow-auto pr-1 text-sm text-copy-secondary">
                {state.moveHistory.map((move, index) => (
                  <li
                    key={`${move}-${index}`}
                    className="grid grid-cols-[3rem_1fr] rounded-xl bg-elevated px-3 py-2"
                  >
                    <span className="font-mono text-copy-faint">{index + 1}</span>
                    <span>{move}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-xl bg-elevated px-3 py-3 text-sm text-copy-muted">
                No moves yet.
              </p>
            )}
          </Panel>

          <button
            type="button"
            onClick={() => void runAction(() => session.resign())}
            disabled={state.status !== 'active' || seatedColor === null || isSending}
            className="rounded-xl border border-error/50 bg-error/10 px-4 py-3 text-sm font-semibold text-error transition hover:bg-error/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Resign
          </button>
        </aside>
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

function ChessBoard({
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

function GameResultModal({
  result,
  onClose,
  onNewGame,
}: {
  result: string;
  onClose(): void;
  onNewGame(): void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-base/80 px-4 backdrop-blur-sm">
      <section className="w-full max-w-sm rounded-3xl border border-border bg-elevated p-6 shadow-2xl shadow-base/60">
        <p className="font-mono text-xs uppercase tracking-wider text-brand">Game over</p>
        <h2 className="mt-2 text-2xl font-semibold text-copy-primary">{result}</h2>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-copy-primary">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
  isMono = false,
}: {
  label: string;
  value: string;
  isMono?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs uppercase tracking-wider text-copy-faint">{label}</dt>
      <dd
        className={[
          'break-all text-copy-secondary',
          isMono ? 'font-mono text-xs' : 'text-sm capitalize',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}
