-- Add new role values
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'JOURNALIST';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COMMENTATOR';

-- Add optional image for news cards
ALTER TABLE "NewsPost" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Store one current stream comment for homepage
CREATE TABLE IF NOT EXISTS "StreamComment" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL DEFAULT 'main',
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedById" TEXT,
  CONSTRAINT "StreamComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StreamComment_key_key" ON "StreamComment"("key");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'StreamComment_updatedById_fkey'
      AND table_name = 'StreamComment'
  ) THEN
    ALTER TABLE "StreamComment"
      ADD CONSTRAINT "StreamComment_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
