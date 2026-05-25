import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { campaignDataFromBody, jsonSuccess, qrCampaignPayload, validateCampaignInput } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const url = new URL(req.url);
  const active = url.searchParams.get("isActive");
  const campaigns = await prisma.qrCampaign.findMany({
    where: {
      userId: String(user._id),
      ...(active === null ? {} : { isActive: active === "true" })
    },
    include: { _count: { select: { qrCodes: true, scanLogs: true } } },
    orderBy: { updatedAt: "desc" }
  });
  return jsonSuccess({ campaigns: campaigns.map(qrCampaignPayload) });
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = await req.json();
    const error = validateCampaignInput(body);
    if (error) return jsonError(error, 400);
    const campaign = await prisma.qrCampaign.create({
      data: {
        userId: String(user._id),
        name: String(body.name),
        type: String(body.type),
        ...campaignDataFromBody(body)
      },
      include: { _count: { select: { qrCodes: true, scanLogs: true } } }
    });
    await logAudit({ action: "qr.campaign_created", category: "ADMIN", userId: String(user._id), metadata: { campaignName: campaign.name, type: campaign.type }, req });
    return jsonSuccess({ campaign: qrCampaignPayload(campaign) });
  } catch (error: any) {
    return jsonError(error.message || "Unable to create QR campaign", 400);
  }
}
