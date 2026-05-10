import crypto from 'crypto';
import { getServerRest } from '@/lib/ably';
import { prisma } from '@/lib/prisma';

const ABLY_REVOCATION_CLAIM_STALE_MS = 60_000;

function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('base64url');
}

/**
 * Builds the Ably revocation key used for invite-scoped active-game tokens.
 *
 * @param {string} gameId - Active game identifier bound to the invite access.
 * @returns {string} The revocation key to embed in invite-issued Ably JWTs.
 */
export function getActiveGameInviteRevocationKey(gameId: string): string {
  return `game-invite:${gameId}`;
}

/**
 * Creates or replaces the durable invite token for an active game.
 *
 * Persists only the hashed token in `active_game_invite` and returns the raw
 * token for the caller to place in the invite URL.
 *
 * @param {string} gameId - Active game identifier that owns the invite.
 * @returns {Promise<string>} The raw invite token generated for the game.
 * @throws {Error} If the invite metadata cannot be written.
 */
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

/**
 * Checks whether a raw invite token currently grants access to an active game.
 *
 * @param {string} gameId - Active game identifier to validate access for.
 * @param {string | null | undefined} inviteToken - Raw invite token supplied by the requester.
 * @returns {Promise<boolean>} `true` when the token matches a non-revoked invite.
 * @throws {Error} If the invite metadata cannot be read.
 */
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

/**
 * Marks the active game's durable invite as revoked.
 *
 * Updates matching invite metadata in `active_game_invite`; this does not
 * revoke already issued Ably JWTs.
 *
 * @param {string} gameId - Active game identifier whose invite should be revoked.
 * @returns {Promise<void>} Resolves after the invite metadata is updated.
 * @throws {Error} If the invite metadata cannot be updated.
 */
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

/**
 * Revokes active-game invite access in storage and through Ably token revocation.
 *
 * Claims the revocation job in `active_game_invite`, marks the invite revoked,
 * revokes Ably tokens for the game-scoped revocation key, and clears the claim
 * after success or failure.
 *
 * @param {string} gameId - Active game identifier whose invite-issued tokens should be revoked.
 * @returns {Promise<void>} Resolves after revocation succeeds or another fresh claim exists.
 * @throws {Error} If the database claim/update fails or Ably token revocation fails.
 */
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
