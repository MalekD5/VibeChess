'use client';

import { useState } from 'react';
import type { GameState, PlayerColor } from '@/types/game';
import type { GameRealtimeSession } from '@/hooks/game-realtime';
import { copyTextToClipboard } from '@/lib/clipboard';
import { Panel, InfoRow } from '@/components/ui/panel';

function formatPlayerLabel(state: GameState, color: PlayerColor, playerId: string): string {
  const player = state.players[color];
  if (!player) return 'Open';
  return player.id === playerId ? 'You' : 'Joined';
}

function formatShortGameId(gameId: string): string {
  return `${gameId.slice(0, 8)}...${gameId.slice(-4)}`;
}

interface GameSidebarProps {
  state: GameState;
  session: GameRealtimeSession;
  seatedColor: PlayerColor | null;
  autoJoinColor: PlayerColor | null;
  autoJoinInFlight: boolean;
  isSending: boolean;
  shareUrl: string;
  onJoin: (color: PlayerColor) => void;
  onResign: () => void;
}

export function GameSidebar({
  state,
  session,
  seatedColor,
  autoJoinColor,
  autoJoinInFlight,
  isSending,
  shareUrl,
  onJoin,
  onResign,
}: GameSidebarProps) {
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCopyError, setShareCopyError] = useState<string | null>(null);

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
            aria-label="Share URL"
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
              onClick={() => onJoin(color)}
              disabled={
                state.status !== 'waiting' ||
                state.players[color] !== null ||
                seatedColor !== null ||
                autoJoinInFlight ||
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
        onClick={onResign}
        disabled={state.status !== 'active' || seatedColor === null || isSending}
        className="rounded-xl border border-error/50 bg-error/10 px-4 py-3 text-sm font-semibold text-error transition hover:bg-error/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Resign
      </button>
    </aside>
  );
}
