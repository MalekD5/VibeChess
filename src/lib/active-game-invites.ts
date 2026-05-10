import crypto from 'crypto';
import { getServerRest } from '@/lib/ably';
import { prisma } from '@/lib/prisma';

const ABLY_REVOCATION_CLAIM_STALE_MS = 60_000;

function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('base64url');
}

export function getActiveGameInviteRevocationKey(gameId: string): string {
  return `game-invite:${gameId}`;
}

export async function createActiveGameInvite(gameId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  await prisma.activeGameInvite.upsert({
    where: { gameId },
    create: {
      gameId,
      tokenHash: hashInviteToken(token),
    },
    update: {
      tokenHash: hashInviteToken(token),
      revokedAt: null,
      ablyRevokedAt: null,
      ablyRevocationClaimId: null,
      ablyRevocationClaimedAt: null,
    },
  });
  return token;
}

export async function hasActiveGameInvite(
  gameId: string,
  inviteToken?: string | null,
): Promise<boolean> {
  if (!inviteToken) return false;
  const invite = await prisma.activeGameInvite.findFirst({
    where: {
      gameId,
      tokenHash: hashInviteToken(inviteToken),
      revokedAt: null,
    },
    select: { gameId: true },
  });
  return invite !== null;
}

export async function revokeActiveGameInvite(gameId: string): Promise<void> {
  await prisma.activeGameInvite.updateMany({
    where: {
      gameId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeActiveGameInviteAccess(gameId: string): Promise<void> {
  const now = new Date();
  const staleClaimBefore = new Date(now.getTime() - ABLY_REVOCATION_CLAIM_STALE_MS);
  const claimId = crypto.randomUUID();

  const claim = await prisma.activeGameInvite.updateMany({
    where: {
      gameId,
      ablyRevokedAt: null,
      OR: [
        { ablyRevocationClaimId: null },
        { ablyRevocationClaimedAt: { lt: staleClaimBefore } },
      ],
    },
    data: {
      revokedAt: now,
      ablyRevocationClaimId: claimId,
      ablyRevocationClaimedAt: now,
    },
  });

  if (claim.count === 0) return;

  try {
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

    await prisma.activeGameInvite.updateMany({
      where: {
        gameId,
        ablyRevocationClaimId: claimId,
      },
      data: {
        ablyRevokedAt: new Date(),
        ablyRevocationClaimId: null,
        ablyRevocationClaimedAt: null,
      },
    });
  } catch (err) {
    await prisma.activeGameInvite.updateMany({
      where: {
        gameId,
        ablyRevocationClaimId: claimId,
      },
      data: {
        ablyRevocationClaimId: null,
        ablyRevocationClaimedAt: null,
      },
    });
    throw err;
  }
}
