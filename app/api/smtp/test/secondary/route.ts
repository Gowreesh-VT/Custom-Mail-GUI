import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { createSecondaryTransporter } from "@/lib/mailer";

import { prisma } from "@/lib/prisma";
import { encryptText } from "@/lib/encrypt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let userId: string | undefined;
  try {
    const { user } = await requireUser(req);
    userId = String(user._id);
    const body = await req.json().catch(() => null);

    let testUser = user;
    if (body && body.host) {
      testUser = {
        ...user,
        smtpSecondaryHost: body.host,
        smtpSecondaryPort: Number(body.port) || 587,
        smtpSecondaryUser: body.username,
        smtpSecondaryPassEnc: body.password ? encryptText(body.password) : user.smtpSecondaryPassEnc,
        smtpSecondaryFromName: body.fromName,
        smtpSecondaryFromEmail: body.fromEmail,
        smtpSecondaryEncryption: body.encryption || "TLS",
        smtpSecondaryRejectUnauth: body.rejectUnauth !== false
      };
    }

    const started = Date.now();
    const transporter = createSecondaryTransporter(testUser);
    if (!transporter) {
      throw new Error("Secondary SMTP is not fully configured");
    }

    await transporter.verify();
    const latencyMs = Date.now() - started;
    await addSecondaryHealthLog(userId, true, latencyMs);

    return Response.json({ success: true, latencyMs });
  } catch (error: any) {
    if (userId) {
      try {
        await addSecondaryHealthLog(userId, false, 0, error.message);
      } catch {}
    }
    return Response.json({ success: false, error: error.message || "Secondary SMTP test failed" });
  }
}

async function addSecondaryHealthLog(userId: string, success: boolean, latencyMs: number, error?: string) {
  await prisma.smtpHealthLog.create({
    data: {
      userId,
      success,
      latencyMs,
      error,
      smtpType: "secondary"
    }
  });

  const logs = await prisma.smtpHealthLog.findMany({
    where: { userId, smtpType: "secondary" },
    orderBy: { testedAt: "desc" },
    skip: 10,
    select: { id: true }
  });
  if (logs.length) {
    await prisma.smtpHealthLog.deleteMany({ where: { id: { in: logs.map((log) => log.id) } } });
  }
}
