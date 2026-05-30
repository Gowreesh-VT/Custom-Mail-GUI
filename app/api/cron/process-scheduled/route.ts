import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMailForUser } from "@/lib/mailer";
import { fromJson, toStringArray } from "@/lib/json-fields";
import { logAudit } from "@/lib/audit";
import type { AttachmentRecord } from "@/types/models";

export const dynamic = "force-dynamic";

const MAX_PER_RUN = 20;

export async function GET(req: NextRequest) {
  return processScheduled(req);
}

export async function POST(req: NextRequest) {
  return processScheduled(req);
}

async function processScheduled(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await prisma.scheduledEmail.updateMany({
    where: {
      status: "pending",
      scheduledAt: { lt: cutoff24h }
    },
    data: { status: "missed" }
  });

  const due = await prisma.scheduledEmail.findMany({
    where: {
      status: "pending",
      scheduledAt: { lte: now }
    },
    include: { user: true },
    orderBy: { scheduledAt: "asc" },
    take: MAX_PER_RUN
  });

  if (due.length === 0) {
    return Response.json({ processed: 0, message: "No emails due" });
  }

  const results: { id: string; status: string; error?: string }[] = [];

  for (const scheduled of due) {
    const claimed = await prisma.scheduledEmail.updateMany({
      where: {
        id: scheduled.id,
        status: "pending"
      },
      data: { status: "sending" }
    });

    if (claimed.count === 0) continue;

    try {
      const to = toStringArray(scheduled.toAddresses);
      const cc = toStringArray(scheduled.ccAddresses);
      const bcc = toStringArray(scheduled.bccAddresses);
      const attachments = fromJson<AttachmentRecord[]>(scheduled.attachments, []);
      const sentAt = new Date();

      await sendMailForUser(scheduled.user, {
        to,
        cc,
        bcc,
        replyTo: scheduled.replyTo ?? undefined,
        subject: scheduled.subject,
        bodyHtml: scheduled.bodyHtml,
        attachments: attachments.map((attachment) => ({
          name: attachment.name,
          path: attachment.path,
          contentType: attachment.mimeType
        }))
      });

      await prisma.scheduledEmail.update({
        where: { id: scheduled.id },
        data: { status: "sent", sentAt }
      });

      await prisma.email.create({
        data: {
          userId: scheduled.userId,
          toAddresses: scheduled.toAddresses,
          ccAddresses: scheduled.ccAddresses,
          bccAddresses: scheduled.bccAddresses,
          replyTo: scheduled.replyTo,
          subject: scheduled.subject,
          bodyHtml: scheduled.bodyHtml,
          attachments: scheduled.attachments,
          status: "sent",
          isBulk: false,
          sentAt
        }
      });

      await logAudit({
        action: "email.scheduled_sent",
        category: "EMAIL",
        userId: scheduled.userId,
        userName: scheduled.user.name,
        metadata: {
          scheduledEmailId: scheduled.id,
          to,
          subject: scheduled.subject
        }
      });

      results.push({ id: scheduled.id, status: "sent" });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      await prisma.scheduledEmail.update({
        where: { id: scheduled.id },
        data: {
          status: "failed",
          errorMsg,
          retryCount: { increment: 1 }
        }
      });

      results.push({ id: scheduled.id, status: "failed", error: errorMsg });
    }
  }

  return Response.json({
    processed: results.length,
    sent: results.filter((result) => result.status === "sent").length,
    failed: results.filter((result) => result.status === "failed").length,
    results
  });
}
