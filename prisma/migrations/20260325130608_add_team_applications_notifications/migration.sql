-- CreateEnum
CREATE TYPE "TeamApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TeamApplication" (
    "id" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamLogoUrl" TEXT,
    "status" "TeamApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "captainId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,

    CONSTRAINT "TeamApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamApplicationMember" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationId" TEXT NOT NULL,
    "linkedUserId" TEXT,

    CONSTRAINT "TeamApplicationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTournamentNotification" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamApplicationId" TEXT,

    CONSTRAINT "UserTournamentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamApplication_captainId_tournamentId_key" ON "TeamApplication"("captainId", "tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamApplicationMember_applicationId_username_key" ON "TeamApplicationMember"("applicationId", "username");

-- AddForeignKey
ALTER TABLE "TeamApplication" ADD CONSTRAINT "TeamApplication_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamApplication" ADD CONSTRAINT "TeamApplication_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamApplicationMember" ADD CONSTRAINT "TeamApplicationMember_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TeamApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamApplicationMember" ADD CONSTRAINT "TeamApplicationMember_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTournamentNotification" ADD CONSTRAINT "UserTournamentNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTournamentNotification" ADD CONSTRAINT "UserTournamentNotification_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTournamentNotification" ADD CONSTRAINT "UserTournamentNotification_teamApplicationId_fkey" FOREIGN KEY ("teamApplicationId") REFERENCES "TeamApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
