import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { parseList } from "@/lib/utils";
import { scheduleEmail } from "@/lib/scheduler";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { scheduledRecord } from "@/lib/records";
import { normalizeUploadedAttachmentRecords } from "@/lib/security";
import { jsonError } from "@/lib/utils";

const schema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
  bcc: z.union([z.string(), z.array(z.string())]).optional(),
  replyTo: z.string().optional(),
  subject: z.string().min(1),
  bodyHtml: z.string().default(""),
  attachments: z.array(z.object({ name: z.string(), size: z.number(), mimeType: z.string(), path: z.string() })).optional(),
  scheduledAt: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = schema.parse(await req.json());
    const attachments = await normalizeUploadedAttachmentRecords(String(user._id), body.attachments || []);
    const scheduledId = await scheduleEmail({
      userId: String(user._id),
      toAddresses: parseList(body.to),
      ccAddresses: parseList(body.cc),
      bccAddresses: parseList(body.bcc),
      replyTo: body.replyTo,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      attachments,
      scheduledAt: new Date(body.scheduledAt)
    });
    const scheduled = scheduledRecord(await prisma.scheduledEmail.findUnique({ where: { id: scheduledId } }));
    await logAudit("email.scheduled", String(user._id), { subject: scheduled.subject, scheduledAt: scheduled.scheduledAt }, String(scheduled._id), req);
    return Response.json({ success: true, scheduled });
  } catch (error: any) {
    return jsonError(error.message || "Unable to schedule email", 400);
  }
}
