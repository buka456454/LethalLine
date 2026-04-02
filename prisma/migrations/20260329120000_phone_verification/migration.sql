-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "phoneVerificationCodeHash" TEXT,
ADD COLUMN     "phoneVerificationExpires" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

ALTER TABLE "User" DROP COLUMN "emailVerifiedAt",
DROP COLUMN "emailVerificationTokenHash",
DROP COLUMN "emailVerificationCodeHash",
DROP COLUMN "emailVerificationExpires";
