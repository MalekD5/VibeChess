import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { HistoryReviewWorkspace } from '@/components/history-review-workspace';
import { getOwnedGameHistoryReview } from '@/lib/game-history';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Game Review | VibeChess',
};

function BackToHistoryLink() {
  return (
    <Link
      href="/history"
      className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-copy-secondary transition-colors hover:bg-accent-dim hover:text-copy-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <ArrowLeft aria-hidden="true" size={16} />
      Back to History
    </Link>
  );
}

function UnavailableHistoryState() {
  return (
    <main className="min-h-dvh bg-base px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <BackToHistoryLink />
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h1 className="text-2xl font-semibold text-copy-primary">Review Unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-copy-muted">
            This game history cannot be reviewed because its stored move data is incomplete or malformed.
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function HistoryReviewPage(props: { params: Promise<{ gameId: string }> }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/');
  }

  const { gameId } = await props.params;
  const result = await getOwnedGameHistoryReview({
    gameId,
    userId: currentUser.id,
    displayName: currentUser.name,
  });

  if (result.status === 'not-found') {
    notFound();
  }

  if (result.status === 'unavailable') {
    return <UnavailableHistoryState />;
  }

  const matchup = `${result.review.whitePlayerDisplayName} vs ${result.review.blackPlayerDisplayName}`;

  return (
    <main className="min-h-dvh bg-base px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-5">
        <BackToHistoryLink />
        <header className="min-w-0">
          <p className="text-sm font-medium text-brand">Completed Game Review</p>
          <h1 className="mt-2 break-words text-3xl font-semibold text-copy-primary">{matchup}</h1>
          <p className="mt-2 text-sm text-copy-muted">
            Ended {result.review.displayEndedAt}
          </p>
        </header>
        <HistoryReviewWorkspace review={result.review} />
      </div>
    </main>
  );
}
