import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createQrForBody, jsonSuccess, qrCodePayload } from "@/lib/qr-api";

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const result = await createQrForBody(String(user._id), await req.json());
  if (result.error) return result.error;
  await logAudit({ action: "qr.code_generated", category: "EMAIL", userId: String(user._id), metadata: { campaignId: result.qrCode!.campaignId, contentType: result.qrCode!.contentType }, req });
  return jsonSuccess({ qrCode: qrCodePayload(result.qrCode) });
}
