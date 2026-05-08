import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PlayerHistoryList } from '@/components/player-history-list';
import { PlayerHistoryOverview } from '@/components/player-history-overview';
import {
  encodePlayerHistoryCursor,
  getPlayerHistoryPage,
} from '@/lib/game-history';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Player History | VibeChess',
};

export default async function HistoryPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/');
  }

  const history = await getPlayerHistoryPage({
    userId: currentUser.id,
    displayName: currentUser.name,
    cursor: null,
  });

  return (
    <main className="min-h-dvh bg-base px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-5">
        <PlayerHistoryOverview overview={history.overview} />
        <PlayerHistoryList
          initialGames={history.games}
          initialHasMore={history.hasMore}
          initialNextCursor={encodePlayerHistoryCursor(history.nextCursor)}
        />
      </div>
    </main>
  );
}
