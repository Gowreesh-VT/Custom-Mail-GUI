import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { createTransporter } from "@/lib/mailer";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const started = Date.now();
    await createTransporter(user).verify();
    const latencyMs = Date.now() - started;
    await addHealthLog(String(user._id), true, latencyMs);
    return Response.json({ success: true, status: "connected", latencyMs });
  } catch (error: any) {
    try {
      const { user } = await requireUser(req);
      await addHealthLog(String(user._id), false, 0, error.message);
    } catch {}
    return jsonError(error.message || "SMTP test failed", 400, "SMTP_TEST_FAILED");
  }
}

async function addHealthLog(userId: string, success: boolean, latencyMs: number, error?: string) {
  await prisma.smtpHealthLog.create({ data: { userId, success, latencyMs, error } });
  const logs = await prisma.smtpHealthLog.findMany({ where: { userId }, orderBy: { testedAt: "desc" }, skip: 10, select: { id: true } });
  if (logs.length) await prisma.smtpHealthLog.deleteMany({ where: { id: { in: logs.map((log) => log.id) } } });
}
