import crypto from 'crypto';
import { getServerRest } from '@/lib/ably';

const inviteTokens = new Map<string, string>();
const inviteAccessGames = new Set<string>();
const revokedInviteAccess = new Set<string>();

export function getActiveGameInviteRevocationKey(gameId: string): string {
  return `game-invite:${gameId}`;
}

export function createActiveGameInvite(gameId: string): string {
  const token = crypto.randomBytes(32).toString('base64url');
  inviteTokens.set(gameId, token);
  inviteAccessGames.add(gameId);
  revokedInviteAccess.delete(gameId);
  return token;
}

export function hasActiveGameInvite(gameId: string, inviteToken?: string | null): boolean {
  if (!inviteToken) return false;
  return inviteTokens.get(gameId) === inviteToken;
}

export function revokeActiveGameInvite(gameId: string): void {
  inviteTokens.delete(gameId);
  inviteAccessGames.delete(gameId);
}

export async function revokeActiveGameInviteAccess(gameId: string): Promise<void> {
  inviteTokens.delete(gameId);
  if (!inviteAccessGames.has(gameId)) return;
  if (revokedInviteAccess.has(gameId)) return;

  const result = await getServerRest().auth.revokeTokens(
    [
      {
        type: 'revocationKey',
        value: getActiveGameInviteRevocationKey(gameId),
      },
    ],
    {
      allowReauthMargin: false,
    },
  );

  if (result.failureCount > 0) {
    const details = result.results
      .map((item) => ('error' in item ? item.error.message : null))
      .filter((message): message is string => message !== null)
      .join('; ');
    throw new Error(
      details
        ? `Failed to revoke invite Ably tokens for ${gameId}: ${details}`
        : `Failed to revoke invite Ably tokens for ${gameId}`,
    );
  }

  revokedInviteAccess.add(gameId);
}
