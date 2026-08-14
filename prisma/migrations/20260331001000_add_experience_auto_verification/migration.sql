-- CreateEnum
CREATE TYPE "ExternalProvider" AS ENUM ('STEAM', 'FACEIT', 'RIOT');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('NONE', 'SELF_REPORTED', 'SCREENSHOT', 'LINKED_ACCOUNT', 'API');

-- CreateEnum
CREATE TYPE "VerificationChallengeKind" AS ENUM ('STEAM_PROFILE_CODE', 'SCREENSHOT_CODE');

-- AlterTable
ALTER TABLE "UserGameProfile" ADD COLUMN     "trustLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verificationFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "verificationSource" "ExternalProvider",
ADD COLUMN     "verificationSyncedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedHoursPlayed" INTEGER,
ADD COLUMN     "verifiedRankLabel" TEXT,
ADD COLUMN     "verifiedRankNumeric" INTEGER;

-- CreateTable
CREATE TABLE "ExternalAccount" (
    "id" TEXT NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "handle" TEXT,
    "profileUrl" TEXT,
    "avatarUrl" TEXT,
    "proofMethod" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "ExternalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedExternalAccount" (
    "id" TEXT NOT NULL,
    "provider" "ExternalProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedExternalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationChallenge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "VerificationChallengeKind" NOT NULL,
    "provider" "ExternalProvider",
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "gameId" TEXT,

    CONSTRAINT "VerificationChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalAccount_userId_idx" ON "ExternalAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalAccount_provider_providerAccountId_key" ON "ExternalAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalAccount_userId_provider_key" ON "ExternalAccount"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedExternalAccount_provider_providerAccountId_key" ON "BlockedExternalAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationChallenge_code_key" ON "VerificationChallenge"("code");

-- CreateIndex
CREATE INDEX "VerificationChallenge_userId_kind_idx" ON "VerificationChallenge"("userId", "kind");

-- CreateIndex
CREATE INDEX "VerificationChallenge_expiresAt_idx" ON "VerificationChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "UserGameProfile_verificationExpiresAt_idx" ON "UserGameProfile"("verificationExpiresAt");

-- AddForeignKey
ALTER TABLE "ExternalAccount" ADD CONSTRAINT "ExternalAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationChallenge" ADD CONSTRAINT "VerificationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationChallenge" ADD CONSTRAINT "VerificationChallenge_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
