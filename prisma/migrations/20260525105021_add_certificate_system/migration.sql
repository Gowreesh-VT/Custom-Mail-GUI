-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pdfBase64" TEXT NOT NULL,
    "pdfFileName" TEXT NOT NULL,
    "pdfSizeBytes" INTEGER NOT NULL,
    "pageWidth" DOUBLE PRECISION NOT NULL,
    "pageHeight" DOUBLE PRECISION NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "fields" TEXT NOT NULL DEFAULT '[]',
    "previewImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateGeneration" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bulkJobId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "mergeData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMsg" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificateTemplate_userId_idx" ON "CertificateTemplate"("userId");

-- CreateIndex
CREATE INDEX "CertificateTemplate_userId_isActive_idx" ON "CertificateTemplate"("userId", "isActive");

-- CreateIndex
CREATE INDEX "CertificateTemplate_updatedAt_idx" ON "CertificateTemplate"("updatedAt");

-- CreateIndex
CREATE INDEX "CertificateGeneration_templateId_idx" ON "CertificateGeneration"("templateId");

-- CreateIndex
CREATE INDEX "CertificateGeneration_userId_idx" ON "CertificateGeneration"("userId");

-- CreateIndex
CREATE INDEX "CertificateGeneration_status_idx" ON "CertificateGeneration"("status");

-- CreateIndex
CREATE INDEX "CertificateGeneration_createdAt_idx" ON "CertificateGeneration"("createdAt");

-- CreateIndex
CREATE INDEX "CertificateGeneration_recipientEmail_idx" ON "CertificateGeneration"("recipientEmail");

-- AddForeignKey
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateGeneration" ADD CONSTRAINT "CertificateGeneration_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
