import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { testSmtpPoolEntry } from "@/lib/smtp-pool";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const userId = String(user._id);
  const entry = await prisma.smtpPool.findFirst({ where: { id, userId } });
  if (!entry) return jsonError("SMTP entry not found", 404);
  if (entry.isAdminAssigned) return jsonError("Admin-managed SMTP cannot be tested here", 403);

  try {
    const latencyMs = await testSmtpPoolEntry(entry);
    await prisma.smtpPool.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestSuccess: true, lastTestLatency: latencyMs }
    });
    return Response.json({ success: true, latencyMs });
  } catch (error: any) {
    await prisma.smtpPool.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestSuccess: false, lastTestLatency: null }
    });
    return Response.json({ success: false, latencyMs: 0, error: error.message || "SMTP test failed" }, { status: 400 });
  }
}
