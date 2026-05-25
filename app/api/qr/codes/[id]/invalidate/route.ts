import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { jsonSuccess } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const result = await prisma.qrCode.updateMany({ where: { id, userId: String(user._id) }, data: { status: "invalidated" } });
  if (!result.count) return jsonError("QR code not found", 404);
  const qrCode = await prisma.qrCode.findUnique({ where: { id } });
  await logAudit({ action: "qr.code_invalidated", category: "EMAIL", userId: String(user._id), metadata: { qrCodeId: id, campaignId: qrCode?.campaignId }, req });
  return jsonSuccess({});
}
