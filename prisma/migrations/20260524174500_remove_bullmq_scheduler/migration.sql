ALTER TABLE "ScheduledEmail" DROP COLUMN IF EXISTS "bullJobId";

ALTER TABLE "ScheduledEmail"
  ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "ScheduledEmail_status_scheduledAt_idx" ON "ScheduledEmail"("status", "scheduledAt");
