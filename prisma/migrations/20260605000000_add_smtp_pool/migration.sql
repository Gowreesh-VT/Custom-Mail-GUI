-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminSmtpLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SmtpFallbackLog" ADD COLUMN "metadata" TEXT;

-- CreateTable
CREATE TABLE "SmtpPool" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "encryption" TEXT NOT NULL,
    "rejectUnauth" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "isAdminAssigned" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestSuccess" BOOLEAN,
    "lastTestLatency" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpPool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmtpPool_userId_idx" ON "SmtpPool"("userId");

-- CreateIndex
CREATE INDEX "SmtpPool_userId_isAdminAssigned_idx" ON "SmtpPool"("userId", "isAdminAssigned");

-- CreateIndex
CREATE INDEX "SmtpPool_userId_isPrimary_idx" ON "SmtpPool"("userId", "isPrimary");

-- CreateIndex
CREATE INDEX "SmtpPool_userId_isFallback_idx" ON "SmtpPool"("userId", "isFallback");

-- AddForeignKey
ALTER TABLE "SmtpPool" ADD CONSTRAINT "SmtpPool_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
