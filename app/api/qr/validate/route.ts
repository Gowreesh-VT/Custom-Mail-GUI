import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { decodeQrData } from "@/lib/qr";
import { jsonSuccess, parseDisplayFields, requestMeta } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";
import { clearRateLimit, getRequestIp, rateLimitAttempt } from "@/lib/security";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const operatorId = String(body.operatorId || "");
  const rateKey = `qr-validate:${getRequestIp(req)}:${operatorId}`;
  const limiter = rateLimitAttempt(rateKey, 5, 15 * 60 * 1000);
  if (!limiter.allowed) return jsonError("Too many PIN attempts. Try again later.", 429, "RATE_LIMITED");
  const operator = await prisma.qrOperator.findUnique({ where: { id: operatorId } });
  if (!operator || !(await bcrypt.compare(String(body.operatorPin || ""), operator.pinHash))) {
    return jsonError("Invalid PIN", 401);
  }
  if (!operator.isActive) return jsonError("Operator account is deactivated", 403);
  clearRateLimit(rateKey);

  const decoded = decodeQrData(String(body.encodedData || ""));
  if (!decoded.isSystemQr) return Response.json({ success: true, result: "invalid", message: "Unknown QR format" });

  const qrCode = await prisma.qrCode.findUnique({
    where: { id: decoded.id },
    include: {
      campaign: { include: { operators: { where: { operatorId: operator.id }, select: { id: true } } } }
    }
  });

  if (!qrCode) return Response.json({ success: true, result: "invalid", fields: decoded.fields });
  if (!qrCode.campaign.operators.length) return jsonError("Not assigned to this campaign", 403);

  const meta = requestMeta(req);
  const now = new Date();
  const expired = qrCode.status === "expired" || Boolean(qrCode.campaign.expiresAt && qrCode.campaign.expiresAt < now);
  if (expired) {
    await prisma.qrScanLog.create({ data: { qrCodeId: qrCode.id, campaignId: qrCode.campaignId, operatorId: operator.id, result: "expired", ...meta } });
    return Response.json({ success: true, result: "expired", fields: decoded.fields });
  }

  if (qrCode.status === "invalidated") {
    await prisma.qrScanLog.create({ data: { qrCodeId: qrCode.id, campaignId: qrCode.campaignId, operatorId: operator.id, result: "invalid", ...meta } });
    return Response.json({ success: true, result: "invalid", fields: decoded.fields });
  }

  if (qrCode.campaign.scanMode === "once" && qrCode.scanCount >= 1) {
    await prisma.qrScanLog.create({ data: { qrCodeId: qrCode.id, campaignId: qrCode.campaignId, operatorId: operator.id, result: "used", ...meta } });
    return Response.json({ success: true, result: "used", fields: filteredFields(decoded.fields, parseDisplayFields(qrCode.campaign.displayFields)), firstScannedAt: qrCode.lastScannedAt });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const code = await tx.qrCode.update({
      where: { id: qrCode.id },
      data: {
        scanCount: { increment: 1 },
        lastScannedAt: now,
        ...(qrCode.campaign.scanMode === "once" ? { status: "used" } : {})
      }
    });
    await tx.qrOperator.update({ where: { id: operator.id }, data: { totalScans: { increment: 1 }, lastScanAt: now } });
    await tx.qrScanLog.create({ data: { qrCodeId: qrCode.id, campaignId: qrCode.campaignId, operatorId: operator.id, result: "valid", ...meta } });
    return code;
  });

  return jsonSuccess({
    result: "valid",
    fields: filteredFields(decoded.fields, parseDisplayFields(qrCode.campaign.displayFields)),
    campaignName: qrCode.campaign.name,
    scanCount: updated.scanCount
  });
}

function filteredFields(fields: Record<string, string>, displayFields: string[]) {
  if (!displayFields.length) return fields;
  return Object.fromEntries(displayFields.map((field) => [field, fields[field] ?? fields[field.toUpperCase()] ?? ""]));
}
