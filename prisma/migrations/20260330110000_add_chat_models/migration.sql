-- CreateTable
CREATE TABLE "ChatDialog" (
    "id" TEXT NOT NULL,
    "participantAId" TEXT NOT NULL,
    "participantBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatDialog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "dialogId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "readById" TEXT,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatDialog_participantAId_participantBId_key" ON "ChatDialog"("participantAId", "participantBId");

-- CreateIndex
CREATE INDEX "ChatDialog_participantAId_idx" ON "ChatDialog"("participantAId");

-- CreateIndex
CREATE INDEX "ChatDialog_participantBId_idx" ON "ChatDialog"("participantBId");

-- CreateIndex
CREATE INDEX "ChatDialog_updatedAt_idx" ON "ChatDialog"("updatedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_dialogId_createdAt_idx" ON "ChatMessage"("dialogId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "ChatDialog" ADD CONSTRAINT "ChatDialog_participantAId_fkey" FOREIGN KEY ("participantAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatDialog" ADD CONSTRAINT "ChatDialog_participantBId_fkey" FOREIGN KEY ("participantBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_dialogId_fkey" FOREIGN KEY ("dialogId") REFERENCES "ChatDialog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_readById_fkey" FOREIGN KEY ("readById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
