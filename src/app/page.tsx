import VibeChessApp from '@/components/vibe-chess-app';
import { AuthEntry } from '@/components/auth-entry';
import { getCurrentUser } from '@/lib/session';

export default async function Home() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <AuthEntry />;
  }

  return <VibeChessApp currentUser={currentUser} />;
}
