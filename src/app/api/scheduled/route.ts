import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { cancelScheduledEmail } from "@/lib/scheduler";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { fromJson, toStringArray } from "@/lib/json-fields";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const rows = await prisma.scheduledEmail.findMany({
    where: { userId: String(user._id) },
    orderBy: { scheduledAt: "asc" },
    take: 100,
    select: {
      id: true,
      toAddresses: true,
      ccAddresses: true,
      bccAddresses: true,
      replyTo: true,
      subject: true,
      bodyHtml: true,
      attachments: true,
      scheduledAt: true,
      status: true,
      sentAt: true,
      errorMsg: true,
      createdAt: true,
      updatedAt: true
    }
  });
  const scheduled = rows.map((row) => ({
    ...row,
    _id: row.id,
    to: toStringArray(row.toAddresses),
    cc: toStringArray(row.ccAddresses),
    bcc: toStringArray(row.bccAddresses),
    toAddresses: toStringArray(row.toAddresses),
    ccAddresses: toStringArray(row.ccAddresses),
    bccAddresses: toStringArray(row.bccAddresses),
    attachments: fromJson(row.attachments, [])
  }));
  return Response.json({ success: true, scheduled });
}

export async function DELETE(req: NextRequest) {
  const { user } = await requireUser(req);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("Missing scheduled email id", 400, "SCHEDULE_ID_REQUIRED");

  const item = await prisma.scheduledEmail.findFirst({
    where: { id, userId: String(user._id) },
    select: { id: true, subject: true }
  });
  if (!item) return Response.json({ success: true });

  const cancelled = await cancelScheduledEmail(item.id, String(user._id));
  if (!cancelled) {
    return jsonError("Cannot cancel - email is not in pending status", 400, "SCHEDULE_CANCEL_FAILED");
  }

  await logAudit("email.schedule_cancelled", String(user._id), { subject: item.subject }, item.id, req);
  return Response.json({ success: true });
}
