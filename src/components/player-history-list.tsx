'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { PlayerHistoryBoardPreview } from '@/components/player-history-board-preview';
import type { PlayerHistoryRow } from '@/types/player-history';

interface HistoryBatchResponse {
  games: PlayerHistoryRow[];
  hasMore: boolean;
  nextCursor: string | null;
}

function formatPerspectiveResult(result: PlayerHistoryRow['perspectiveResult']): string {
  if (result === 'win') return 'Win';
  if (result === 'loss') return 'Loss';
  if (result === 'draw') return 'Draw';
  return 'Unknown';
}

function formatResultDescription(game: PlayerHistoryRow): string {
  if (game.winnerDisplayName) {
    const reason = game.resultReason === 'unknown' ? '' : ` by ${game.resultReason.replace('-', ' ')}`;
    return `${game.winnerDisplayName} won${reason}`;
  }

  if (game.perspectiveResult === 'draw') {
    const reason = game.resultReason === 'unknown' ? '' : ` by ${game.resultReason.replace('-', ' ')}`;
    return `Draw${reason}`;
  }

  return formatPerspectiveResult(game.perspectiveResult);
}

function HistoryRow({ game }: { game: PlayerHistoryRow }) {
  const matchup = `${game.whitePlayerDisplayName} vs ${game.blackPlayerDisplayName}`;

  return (
    <li className="grid gap-4 border-t border-border bg-surface px-4 py-5 first:border-t-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:px-5">
      <PlayerHistoryBoardPreview finalFen={game.finalFen} />
      <div className="min-w-0 space-y-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-lg font-semibold text-copy-primary">
            {matchup}
          </h3>
          <p className="text-sm text-copy-muted">{game.displayDate}</p>
        </div>
        <dl className="flex flex-wrap items-center gap-2 text-sm">
          <div className="min-w-0 rounded-xl border border-brand bg-accent-dim px-3 py-2">
            <dt className="sr-only">Result</dt>
            <dd className="font-semibold text-brand">{formatResultDescription(game)}</dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

export function PlayerHistoryList({
  initialGames,
  initialHasMore,
  initialNextCursor,
}: {
  initialGames: PlayerHistoryRow[];
  initialHasMore: boolean;
  initialNextCursor: string | null;
}) {
  const [games, setGames] = useState(initialGames);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;

    setError(null);
    setIsLoadingMore(true);
    const params = new URLSearchParams({ limit: '5', cursor: nextCursor });

    try {
      const response = await fetch(`/api/history?${params.toString()}`);
      if (!response.ok) throw new Error('Could not load more games.');

      const data = (await response.json()) as HistoryBatchResponse;

      startTransition(() => {
        setGames((currentGames) => [...currentGames, ...data.games]);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load more games.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextCursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: '240px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <h2 className="text-lg font-semibold text-copy-primary">No completed games yet</h2>
        <p className="mt-2 text-sm text-copy-muted">
          Finished games will appear here with their final board positions.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="history-list-title" className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h2 id="history-list-title" className="text-sm font-semibold uppercase tracking-wide text-copy-muted">
          Completed Games
        </h2>
      </div>
      <ul>
        {games.map((game) => (
          <HistoryRow key={game.id} game={game} />
        ))}
      </ul>
      <div ref={sentinelRef} className="border-t border-border px-4 py-4 text-center text-sm text-copy-muted sm:px-5">
        {error ? (
          <p role="status" aria-live="polite" className="text-error">
            {error}
          </p>
        ) : isLoadingMore || isPending ? (
          <p role="status" aria-live="polite">
            Loading more games…
          </p>
        ) : hasMore ? (
          <p>Scroll to load more games.</p>
        ) : (
          <p>End of history.</p>
        )}
      </div>
    </section>
  );
}
