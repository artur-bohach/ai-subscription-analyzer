-- Bring the committed migration history in line with the current Prisma schema.
-- This migration is intentionally idempotent because some local databases were
-- already updated during FR5 development before the migration file was committed.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
UPDATE "User"
SET "email" = CONCAT('user', "id", '@subtracker.local')
WHERE "email" IS NULL;
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "User"
SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP);
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_userId_fkey";
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
