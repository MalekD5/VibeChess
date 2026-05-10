'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState, PlayerColor } from '@/types/game';
import type { GameConnectionStatus } from '@/hooks/game-realtime';
import { copyTextToClipboard } from '@/lib/clipboard';
import { Panel, InfoRow } from '@/components/ui/panel';

function formatPlayerLabel(state: GameState, color: PlayerColor, playerId: string): string {
  const player = state.players[color];
  if (!player) return 'Open';
  if (player.kind === 'ai') return `AI ${player.aiDifficulty}`;
  return player.id === playerId ? 'You' : 'Joined';
}

function formatShortGameId(gameId: string): string {
  return `${gameId.slice(0, 8)}…${gameId.slice(-4)}`;
}

interface GameSidebarProps {
  state: GameState;
  gameId: string;
  playerId: string;
  connectionStatus: GameConnectionStatus;
  seatedColor: PlayerColor | null;
  autoJoinColor: PlayerColor | null;
  autoJoinInFlight: boolean;
  manualJoinColor: PlayerColor | null;
  isSending: boolean;
  shareUrl: string;
  onJoin: (color: PlayerColor) => void;
  onResign: () => void;
}

export function GameSidebar({
  state,
  gameId,
  playerId,
  connectionStatus,
  seatedColor,
  autoJoinColor,
  autoJoinInFlight,
  manualJoinColor,
  isSending,
  shareUrl,
  onJoin,
  onResign,
}: GameSidebarProps) {
  return (
    <aside className="grid min-h-0 content-start gap-4 overflow-y-auto">
      <SessionPanel
        state={state}
        gameId={gameId}
        connectionStatus={connectionStatus}
        seatedColor={seatedColor}
      />
      <SharePanel shareUrl={shareUrl} />
      <PlayersPanel
        state={state}
        playerId={playerId}
        seatedColor={seatedColor}
        autoJoinColor={autoJoinColor}
        autoJoinInFlight={autoJoinInFlight}
        manualJoinColor={manualJoinColor}
        isSending={isSending}
        onJoin={onJoin}
      />
      <MovesPanel moveHistory={state.moveHistory} />
      <ResignButton
        disabled={state.status !== 'active' || seatedColor === null || isSending}
        onResign={onResign}
      />
    </aside>
  );
}

function SessionPanel({
  state,
  gameId,
  connectionStatus,
  seatedColor,
}: {
  state: GameState;
  gameId: string;
  connectionStatus: GameConnectionStatus;
  seatedColor: PlayerColor | null;
}) {
  return (
    <Panel title="Session">
      <dl className="grid gap-3 text-sm">
        <InfoRow label="Game" value={formatShortGameId(gameId)} isMono />
        <InfoRow label="Connection" value={connectionStatus} />
        <InfoRow label="Status" value={state.status} />
        <InfoRow
          label="Current turn"
          value={state.currentTurn === 'white' ? 'White' : 'Black'}
        />
        <InfoRow label="Your seat" value={seatedColor ?? 'Observer'} />
      </dl>
    </Panel>
  );
}

function SharePanel({ shareUrl }: { shareUrl: string }) {
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCopyError, setShareCopyError] = useState<string | null>(null);
  const resetCopiedTimeoutRef = useRef<number | null>(null);

  async function handleCopyShareUrl(): Promise<void> {
    setShareCopyError(null);

    try {
      await copyTextToClipboard(shareUrl);
      setShareCopied(true);

      if (resetCopiedTimeoutRef.current !== null) {
        window.clearTimeout(resetCopiedTimeoutRef.current);
      }

      resetCopiedTimeoutRef.current = window.setTimeout(() => {
        setShareCopied(false);
        resetCopiedTimeoutRef.current = null;
      }, 1200);
    } catch (err) {
      console.error('Could not copy share link', err);
      setShareCopied(false);
      setShareCopyError('Could not copy link. Select the URL and copy it manually.');
    }
  }

  useEffect(() => {
    return () => {
      if (resetCopiedTimeoutRef.current !== null) {
        window.clearTimeout(resetCopiedTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Panel title="Share">
      {!shareUrl ? (
        <p className="rounded-xl bg-elevated px-3 py-3 text-sm text-copy-muted">
          Invite links are available while a human game is waiting for a player.
        </p>
      ) : (
      <div className="grid gap-3">
        <input
          readOnly
          aria-label="Share URL"
          name="share-url"
          autoComplete="off"
          spellCheck={false}
          value={shareUrl}
          className="min-h-10 rounded-xl border border-border bg-elevated px-3 font-mono text-xs text-copy-muted outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
        />
        <button
          type="button"
          onClick={() => void handleCopyShareUrl()}
          className="rounded-xl border border-border-subtle bg-subtle px-3 py-2 text-sm font-medium text-copy-primary transition hover:border-brand focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none"
        >
          {shareCopied ? 'Copied' : 'Copy Share Link'}
        </button>
        {shareCopyError ? (
          <p
            aria-live="polite"
            className="rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-xs text-error"
          >
            {shareCopyError}
          </p>
        ) : null}
      </div>
      )}
    </Panel>
  );
}

function PlayersPanel({
  state,
  playerId,
  seatedColor,
  autoJoinColor,
  autoJoinInFlight,
  manualJoinColor,
  isSending,
  onJoin,
}: {
  state: GameState;
  playerId: string;
  seatedColor: PlayerColor | null;
  autoJoinColor: PlayerColor | null;
  autoJoinInFlight: boolean;
  manualJoinColor: PlayerColor | null;
  isSending: boolean;
  onJoin: (color: PlayerColor) => void;
}) {
  return (
    <Panel title="Players">
      <div className="grid gap-2">
        {(['white', 'black'] as const).map((color) => {
          const player = state.players[color];
          const isAiPlayer = player?.kind === 'ai';

          return (
            <button
              key={color}
              type="button"
              onClick={() => onJoin(color)}
              disabled={
                state.status !== 'waiting' ||
                player !== null ||
                seatedColor !== null ||
                manualJoinColor !== null ||
                autoJoinInFlight ||
                isSending
              }
              className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm transition hover:border-brand focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                isAiPlayer ? 'border-ai/60 bg-ai/10' : 'border-border bg-elevated'
              }`}
            >
              <span className="font-medium capitalize text-copy-primary">{color}</span>
              <span
                className={`truncate ${
                  isAiPlayer ? 'text-ai-text' : 'text-copy-muted'
                }`}
              >
                {manualJoinColor === color
                  ? 'Joining…'
                  : formatPlayerLabel(state, color, playerId)}
              </span>
            </button>
          );
        })}
      </div>
      {autoJoinColor ? (
        <p aria-live="polite" className="mt-3 text-xs text-copy-muted">
          Joining the open {autoJoinColor} seat…
        </p>
      ) : null}
    </Panel>
  );
}

function MovesPanel({ moveHistory }: { moveHistory: string[] }) {
  return (
    <Panel title="Moves">
      {moveHistory.length > 0 ? (
        <ol className="grid max-h-56 gap-2 overflow-auto pr-1 text-sm text-copy-secondary">
          {moveHistory.map((move, index) => (
            <li
              key={`${move}-${index}`}
              className="grid grid-cols-[3rem_minmax(0,1fr)] rounded-xl bg-elevated px-3 py-2"
            >
              <span className="font-mono text-copy-faint">{index + 1}</span>
              <span className="truncate">{move}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl bg-elevated px-3 py-3 text-sm text-copy-muted">
          No moves yet.
        </p>
      )}
    </Panel>
  );
}

function ResignButton({
  disabled,
  onResign,
}: {
  disabled: boolean;
  onResign: () => void;
}) {
  function handleResign(): void {
    if (window.confirm('Resign this game?')) {
      onResign();
    }
  }

  return (
    <button
      type="button"
      onClick={handleResign}
      disabled={disabled}
      className="rounded-xl border border-error/50 bg-error/10 px-4 py-3 text-sm font-semibold text-error transition hover:bg-error/15 focus-visible:ring-2 focus-visible:ring-error/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      Resign
    </button>
  );
}
