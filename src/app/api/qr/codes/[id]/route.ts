import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { jsonSuccess, qrCodePayload } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const qrCode = await prisma.qrCode.findFirst({
    where: { id, userId: String(user._id) },
    include: { campaign: true, scanLogs: { include: { operator: true }, orderBy: { scannedAt: "desc" }, take: 25 } }
  });
  if (!qrCode) return jsonError("QR code not found", 404);
  return jsonSuccess({ qrCode: qrCodePayload(qrCode) });
}
