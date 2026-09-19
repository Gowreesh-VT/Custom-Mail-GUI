import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOwnedCampaign, jsonSuccess, qrCodePayload } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  if (!(await getOwnedCampaign(id, String(user._id)))) return jsonError("Campaign not found", 404);
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));
  const status = url.searchParams.get("status") || "";
  const search = url.searchParams.get("search") || "";
  const where = {
    campaignId: id,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { recipientName: { contains: search, mode: "insensitive" as const } },
            { recipientEmail: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {})
  };
  const [total, qrCodes] = await Promise.all([
    prisma.qrCode.count({ where }),
    prisma.qrCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);
  return jsonSuccess({ total, page, limit, qrCodes: qrCodes.map((code) => qrCodePayload(code, false)) });
}
