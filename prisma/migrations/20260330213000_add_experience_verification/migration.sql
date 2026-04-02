-- Status enum for game experience verification workflow
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExperienceVerificationStatus') THEN
    CREATE TYPE "ExperienceVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- Per-game proof and moderation fields
ALTER TABLE "UserGameProfile"
  ADD COLUMN IF NOT EXISTS "experienceVerificationStatus" "ExperienceVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS "experienceProofImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "experienceProofSubmittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "experienceVerificationReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "experienceVerificationNote" TEXT;

-- Tournament-level gate for verified experience
ALTER TABLE "Tournament"
  ADD COLUMN IF NOT EXISTS "requiresVerifiedExperience" BOOLEAN NOT NULL DEFAULT false;
