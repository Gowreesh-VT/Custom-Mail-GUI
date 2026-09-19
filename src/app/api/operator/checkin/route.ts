import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { decodeQrData } from "@/lib/qr";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getOperatorFromRequest(req: NextRequest) {
  try {
    const token = req.cookies.get("operatorToken")?.value;
    if (!token) return null;
    const payload = verifyToken(token, "access");
    if (!payload.userId) return null;
    const operator = await prisma.qrOperator.findUnique({
      where: { id: payload.userId }
    });
    if (!operator || !operator.isActive) return null;
    return operator;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const operator = await getOperatorFromRequest(req);
    if (!operator) {
      return jsonError("Unauthorized. Log in first.", 401);
    }

    const body = await req.json();
    const token = String(body.token || "").trim();
    if (!token) {
      return jsonError("Check-in token is required", 400);
    }

    const decoded = decodeQrData(token);
    if (!decoded.isSystemQr || !decoded.id) {
      // Create scan log for invalid scans
      return Response.json({
        success: false,
        error: "Invalid check-in code format",
        statusText: "❌ Invalid"
      }, { status: 400 });
    }

    const qrCode = await prisma.qrCode.findUnique({
      where: { id: decoded.id },
      include: { campaign: true }
    });

    if (!qrCode) {
      return Response.json({
        success: false,
        error: "QR code not found in database",
        statusText: "❌ Invalid"
      }, { status: 404 });
    }

    // Security check: is operator assigned to this campaign?
    const assigned = await prisma.qrCampaignOperator.findUnique({
      where: {
        campaignId_operatorId: {
          campaignId: qrCode.campaignId,
          operatorId: operator.id
        }
      }
    });

    if (!assigned) {
      return Response.json({
        success: false,
        error: "Operator not assigned to this campaign",
        statusText: "❌ Forbidden"
      }, { status: 403 });
    }

    // Expiry check
    if (qrCode.campaign.expiresAt && new Date(qrCode.campaign.expiresAt).getTime() < Date.now()) {
      return Response.json({
        success: false,
        error: "Campaign has expired",
        statusText: "❌ Expired"
      }, { status: 400 });
    }

    // Campaign activity check
    if (!qrCode.campaign.isActive) {
      return Response.json({
        success: false,
        error: "Campaign is inactive",
        statusText: "❌ Inactive"
      }, { status: 400 });
    }

    // Double check-in check
    if (qrCode.campaign.scanMode === "once" && (qrCode.status === "used" || qrCode.scanCount > 0)) {
      const firstScan = await prisma.qrScanLog.findFirst({
        where: { qrCodeId: qrCode.id, result: "valid" },
        orderBy: { scannedAt: "asc" }
      });
      const firstScanTime = firstScan ? firstScan.scannedAt.toLocaleString() : (qrCode.lastScannedAt || qrCode.createdAt).toLocaleString();
      return Response.json({
        success: false,
        error: "Attendee already checked in",
        statusText: "❌ Already Checked In",
        firstCheckInTime: firstScanTime,
        attendee: {
          name: qrCode.recipientName || "Attendee",
          email: qrCode.recipientEmail || "N/A",
          fields: qrCode.mergeData ? JSON.parse(qrCode.mergeData) : {}
        }
      }, { status: 400 });
    }

    // Perform Check-in
    await prisma.$transaction([
      prisma.qrCode.update({
        where: { id: qrCode.id },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: new Date(),
          status: qrCode.campaign.scanMode === "once" ? "used" : "active"
        }
      }),
      prisma.qrScanLog.create({
        data: {
          qrCodeId: qrCode.id,
          campaignId: qrCode.campaignId,
          operatorId: operator.id,
          result: "valid",
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent") || null
        }
      }),
      prisma.qrOperator.update({
        where: { id: operator.id },
        data: {
          totalScans: { increment: 1 },
          lastScanAt: new Date()
        }
      })
    ]);

    return Response.json({
      success: true,
      statusText: "✅ Valid",
      attendee: {
        name: qrCode.recipientName || "Attendee",
        email: qrCode.recipientEmail || "N/A",
        fields: qrCode.mergeData ? JSON.parse(qrCode.mergeData) : {}
      }
    });
  } catch (error: any) {
    return jsonError(error.message || "Failed to process check-in", 500);
  }
}
