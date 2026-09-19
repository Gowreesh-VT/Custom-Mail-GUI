import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { testSmtpPoolEntry } from "@/lib/smtp-pool";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; poolId: string }> }) {
  await requireAdmin(req);
  const { id, poolId } = await params;
  const entry = await prisma.smtpPool.findFirst({ where: { id: poolId, userId: id } });
  if (!entry) return jsonError("SMTP entry not found", 404);

  try {
    const latencyMs = await testSmtpPoolEntry(entry);
    await prisma.smtpPool.update({
      where: { id: poolId },
      data: { lastTestedAt: new Date(), lastTestSuccess: true, lastTestLatency: latencyMs }
    });
    return Response.json({ success: true, latencyMs });
  } catch (error: any) {
    await prisma.smtpPool.update({
      where: { id: poolId },
      data: { lastTestedAt: new Date(), lastTestSuccess: false, lastTestLatency: null }
    });
    return Response.json({ success: false, latencyMs: 0, error: error.message || "SMTP test failed" }, { status: 400 });
  }
}
