import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createQrForBody, jsonSuccess, qrCodePayload } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const body = await req.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return jsonError("Rows are required", 400);

  const qrCodes = [];
  for (const row of rows) {
    const result = await createQrForBody(String(user._id), { ...row, campaignId: body.campaignId, contentType: body.contentType });
    if (result.error) return result.error;
    qrCodes.push(result.qrCode!);
  }

  await logAudit({ action: "qr.bulk_generated", category: "EMAIL", userId: String(user._id), metadata: { campaignId: body.campaignId, count: qrCodes.length }, req });
  return jsonSuccess({ generated: qrCodes.length, qrCodes: qrCodes.map((code) => qrCodePayload(code)) });
}
