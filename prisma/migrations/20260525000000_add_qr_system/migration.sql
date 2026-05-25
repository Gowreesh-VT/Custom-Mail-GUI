CREATE TABLE IF NOT EXISTS "QrCampaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "scanMode" TEXT NOT NULL DEFAULT 'once',
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "brandColor" TEXT NOT NULL DEFAULT '#000000',
    "bgColor" TEXT NOT NULL DEFAULT '#ffffff',
    "logoUrl" TEXT,
    "cornerRadius" INTEGER NOT NULL DEFAULT 0,
    "borderSize" INTEGER NOT NULL DEFAULT 0,
    "borderColor" TEXT NOT NULL DEFAULT '#000000',
    "displayFields" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QrCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QrCode" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "encodedData" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "mergeData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "lastScannedAt" TIMESTAMP(3),
    "emailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QrCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QrScanLog" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "operatorId" TEXT,
    "result" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "QrScanLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QrOperator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "lastScanAt" TIMESTAMP(3),
    "totalScans" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QrOperator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QrCampaignOperator" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QrCampaignOperator_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QrCampaign_userId_idx" ON "QrCampaign"("userId");
CREATE INDEX IF NOT EXISTS "QrCampaign_isActive_idx" ON "QrCampaign"("isActive");
CREATE INDEX IF NOT EXISTS "QrCampaign_type_idx" ON "QrCampaign"("type");
CREATE INDEX IF NOT EXISTS "QrCampaign_expiresAt_idx" ON "QrCampaign"("expiresAt");

CREATE INDEX IF NOT EXISTS "QrCode_campaignId_idx" ON "QrCode"("campaignId");
CREATE INDEX IF NOT EXISTS "QrCode_userId_idx" ON "QrCode"("userId");
CREATE INDEX IF NOT EXISTS "QrCode_status_idx" ON "QrCode"("status");
CREATE INDEX IF NOT EXISTS "QrCode_recipientEmail_idx" ON "QrCode"("recipientEmail");
CREATE INDEX IF NOT EXISTS "QrCode_recipientName_idx" ON "QrCode"("recipientName");
CREATE INDEX IF NOT EXISTS "QrCode_createdAt_idx" ON "QrCode"("createdAt");

CREATE INDEX IF NOT EXISTS "QrScanLog_qrCodeId_idx" ON "QrScanLog"("qrCodeId");
CREATE INDEX IF NOT EXISTS "QrScanLog_campaignId_idx" ON "QrScanLog"("campaignId");
CREATE INDEX IF NOT EXISTS "QrScanLog_operatorId_idx" ON "QrScanLog"("operatorId");
CREATE INDEX IF NOT EXISTS "QrScanLog_result_idx" ON "QrScanLog"("result");
CREATE INDEX IF NOT EXISTS "QrScanLog_scannedAt_idx" ON "QrScanLog"("scannedAt");
CREATE INDEX IF NOT EXISTS "QrScanLog_campaignId_scannedAt_idx" ON "QrScanLog"("campaignId", "scannedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "QrOperator_email_key" ON "QrOperator"("email");
CREATE INDEX IF NOT EXISTS "QrOperator_email_idx" ON "QrOperator"("email");
CREATE INDEX IF NOT EXISTS "QrOperator_isActive_idx" ON "QrOperator"("isActive");
CREATE INDEX IF NOT EXISTS "QrOperator_createdBy_idx" ON "QrOperator"("createdBy");

CREATE UNIQUE INDEX IF NOT EXISTS "QrCampaignOperator_campaignId_operatorId_key" ON "QrCampaignOperator"("campaignId", "operatorId");
CREATE INDEX IF NOT EXISTS "QrCampaignOperator_operatorId_idx" ON "QrCampaignOperator"("operatorId");

ALTER TABLE "QrCampaign" ADD CONSTRAINT "QrCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QrCode" ADD CONSTRAINT "QrCode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "QrCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QrScanLog" ADD CONSTRAINT "QrScanLog_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QrScanLog" ADD CONSTRAINT "QrScanLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "QrCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QrScanLog" ADD CONSTRAINT "QrScanLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "QrOperator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QrCampaignOperator" ADD CONSTRAINT "QrCampaignOperator_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "QrCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QrCampaignOperator" ADD CONSTRAINT "QrCampaignOperator_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "QrOperator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
