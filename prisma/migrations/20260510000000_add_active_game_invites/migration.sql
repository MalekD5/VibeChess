CREATE TABLE "active_game_invite" (
    "gameId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ablyRevokedAt" TIMESTAMP(3),
    "ablyRevocationClaimId" TEXT,
    "ablyRevocationClaimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "active_game_invite_pkey" PRIMARY KEY ("gameId")
);

CREATE UNIQUE INDEX "active_game_invite_tokenHash_key" ON "active_game_invite"("tokenHash");
CREATE INDEX "active_game_invite_revokedAt_idx" ON "active_game_invite"("revokedAt");
CREATE INDEX "active_game_invite_ablyRevokedAt_idx" ON "active_game_invite"("ablyRevokedAt");
