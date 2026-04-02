-- CreateTable
CREATE TABLE "UserGameProfile" (
    "id" TEXT NOT NULL,
    "mmr" INTEGER,
    "rankLabel" TEXT,
    "hoursPlayed" INTEGER,
    "primaryRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "UserGameProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGameProfile_userId_gameId_key" ON "UserGameProfile"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "UserGameProfile" ADD CONSTRAINT "UserGameProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameProfile" ADD CONSTRAINT "UserGameProfile_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
