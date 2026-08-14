-- CreateEnum
CREATE TYPE "public"."CurrencyCode" AS ENUM ('RUB');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('TBANK');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED');

-- CreateEnum
CREATE TYPE "public"."PrizeMode" AS ENUM ('ENTRY_FEES', 'SPONSOR');

-- AlterTable
ALTER TABLE "public"."TeamApplication" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentOrderId" TEXT,
ADD COLUMN     "paymentProvider" "public"."PaymentProvider",
ADD COLUMN     "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "refundId" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Tournament" ADD COLUMN     "currency" "public"."CurrencyCode" NOT NULL DEFAULT 'RUB',
ADD COLUMN     "entryFeeMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "eventDate" TIMESTAMP(3),
ADD COLUMN     "maxTeams" INTEGER NOT NULL DEFAULT 16,
ADD COLUMN     "prizeMode" "public"."PrizeMode" NOT NULL DEFAULT 'ENTRY_FEES',
ADD COLUMN     "sponsorPrizeText" TEXT,
ADD COLUMN     "teamSize" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "TeamApplication_paymentId_key" ON "public"."TeamApplication"("paymentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TeamApplication_paymentOrderId_key" ON "public"."TeamApplication"("paymentOrderId" ASC);
