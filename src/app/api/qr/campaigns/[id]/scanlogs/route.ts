import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOwnedCampaign, jsonSuccess } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  if (!(await getOwnedCampaign(id, String(user._id)))) return jsonError("Campaign not found", 404);
  const url = new URL(req.url);
  const where = {
    campaignId: id,
    ...(url.searchParams.get("result") ? { result: url.searchParams.get("result")! } : {}),
    ...(url.searchParams.get("operatorId") ? { operatorId: url.searchParams.get("operatorId")! } : {}),
    ...dateWhere(url)
  };
  const logs = await prisma.qrScanLog.findMany({
    where,
    include: { operator: true, qrCode: true },
    orderBy: { scannedAt: "desc" },
    take: Math.min(200, Number(url.searchParams.get("limit") || 50))
  });
  if (url.searchParams.get("format") === "csv") {
    const csv = ["Time,Operator,Result,Recipient,IP"].concat(
      logs.map((log) => [log.scannedAt.toISOString(), log.operator?.name || "", log.result, log.qrCode.recipientEmail || log.qrCode.recipientName || "", log.ipAddress || ""].map(csvCell).join(","))
    ).join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=qr-scanlogs.csv" } });
  }
  return jsonSuccess({ scanLogs: logs });
}

function dateWhere(url: URL) {
  const start = url.searchParams.get("startDate");
  const end = url.searchParams.get("endDate");
  return start || end ? { scannedAt: { ...(start ? { gte: new Date(start) } : {}), ...(end ? { lte: new Date(end) } : {}) } } : {};
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
