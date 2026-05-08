import type { PlayerHistoryOverview as PlayerHistoryOverviewData } from '@/types/player-history';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-elevated px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-copy-faint">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-copy-primary">{value}</dd>
    </div>
  );
}

export function PlayerHistoryOverview({ overview }: { overview: PlayerHistoryOverviewData }) {
  return (
    <header className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-wider text-brand">Player History</p>
          <h1 className="mt-2 truncate text-3xl font-semibold text-copy-primary">
            {overview.displayName}
          </h1>
        </div>
        {overview.mostRecentGameDate ? (
          <p className="text-sm text-copy-muted">
            Most recent: {overview.mostRecentGameDate}
          </p>
        ) : null}
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Total Games" value={overview.totalGames} />
        <Stat label="Wins" value={overview.wins} />
        <Stat label="Losses" value={overview.losses} />
        <Stat label="Draws" value={overview.draws} />
      </dl>
    </header>
  );
}
