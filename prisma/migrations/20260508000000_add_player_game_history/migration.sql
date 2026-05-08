CREATE TABLE "chess_game" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whitePlayerId" TEXT,
    "blackPlayerId" TEXT,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "resultReason" TEXT NOT NULL,
    "initialFen" TEXT NOT NULL,
    "finalFen" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "pgn" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeq" INTEGER NOT NULL,
    "plyCount" INTEGER NOT NULL,
    "openingName" TEXT,
    "openingEco" TEXT,

    CONSTRAINT "chess_game_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chess_game_userId_endedAt_idx" ON "chess_game"("userId", "endedAt");
CREATE INDEX "chess_game_whitePlayerId_idx" ON "chess_game"("whitePlayerId");
CREATE INDEX "chess_game_blackPlayerId_idx" ON "chess_game"("blackPlayerId");

ALTER TABLE "chess_game" ADD CONSTRAINT "chess_game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
