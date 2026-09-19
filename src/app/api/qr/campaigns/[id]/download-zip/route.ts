import { type NextRequest } from "next/server";
import JSZip from "jszip";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { applyQrStyling, generateQrBuffer } from "@/lib/qr";
import { getOwnedCampaign } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const campaign = await getOwnedCampaign(id, String(user._id));
  if (!campaign) return jsonError("Campaign not found", 404);
  const qrCodes = await prisma.qrCode.findMany({ where: { campaignId: id }, orderBy: { createdAt: "asc" } });
  const zip = new JSZip();
  for (const code of qrCodes) {
    const buffer = await applyQrStyling(await generateQrBuffer(code.encodedData, campaign), campaign);
    const safeName = (code.recipientName || code.recipientEmail || code.id).replace(/[^\w.-]+/g, "_");
    zip.file(`${safeName}.png`, buffer);
  }
  const output = await zip.generateAsync({ type: "nodebuffer" });
  return new Response(new Uint8Array(output), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${campaign.name.replace(/[^\w.-]+/g, "_")}-qr-codes.zip"`
    }
  });
}
