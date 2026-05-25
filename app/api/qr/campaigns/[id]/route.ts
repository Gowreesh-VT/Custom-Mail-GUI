import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { campaignDataFromBody, getOwnedCampaign, jsonSuccess, qrCampaignPayload, validateCampaignInput } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const campaign = await prisma.qrCampaign.findFirst({
    where: { id, userId: String(user._id) },
    include: { operators: { include: { operator: true } }, _count: { select: { qrCodes: true, scanLogs: true } } }
  });
  if (!campaign) return jsonError("Campaign not found", 404);
  return jsonSuccess({ campaign: qrCampaignPayload(campaign) });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const body = await req.json();
  const error = validateCampaignInput(body, true);
  if (error) return jsonError(error, 400);
  const existing = await getOwnedCampaign(id, String(user._id));
  if (!existing) return jsonError("Campaign not found", 404);
  const campaign = await prisma.qrCampaign.update({
    where: { id },
    data: campaignDataFromBody(body),
    include: { operators: { include: { operator: true } }, _count: { select: { qrCodes: true, scanLogs: true } } }
  });
  await logAudit({ action: "qr.campaign_updated", category: "ADMIN", userId: String(user._id), metadata: { campaignName: campaign.name, changes: Object.keys(body) }, req });
  return jsonSuccess({ campaign: qrCampaignPayload(campaign) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const campaign = await getOwnedCampaign(id, String(user._id));
  if (!campaign) return jsonError("Campaign not found", 404);
  await prisma.qrCampaign.delete({ where: { id } });
  await logAudit({ action: "qr.campaign_deleted", category: "ADMIN", userId: String(user._id), metadata: { campaignName: campaign.name }, req });
  return jsonSuccess({});
}
