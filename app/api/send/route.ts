import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { sendMailForUser } from "@/lib/mailer";
import { parseList, jsonError } from "@/lib/utils";
import { Email } from "@/lib/models";
import { injectTracking } from "@/lib/tracking";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
  bcc: z.union([z.string(), z.array(z.string())]).optional(),
  replyTo: z.string().optional(),
  subject: z.string().min(1),
  bodyHtml: z.string().default(""),
  trackingEnabled: z.boolean().default(true),
  attachments: z.array(z.object({ name: z.string(), size: z.number().optional(), mimeType: z.string().optional(), path: z.string().optional() })).optional()
});

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const body = schema.parse(await req.json());
  const payload = {
    to: parseList(body.to),
    cc: parseList(body.cc),
    bcc: parseList(body.bcc),
    replyTo: body.replyTo,
    subject: body.subject,
    bodyHtml: body.bodyHtml,
    trackingEnabled: body.trackingEnabled,
    attachments: body.attachments || []
  };
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (user.dailyLimit && user.dailyLimit > 0) {
      const sentToday = await Email.countDocuments({ userId: user._id, status: "sent", sentAt: { $gte: today } });
      if (sentToday >= user.dailyLimit) return jsonError(`Daily sending limit reached (${user.dailyLimit})`, 429, "DAILY_LIMIT_REACHED");
    }
    const email = await Email.create({ userId: user._id, ...payload, status: "sent", sentAt: new Date() });
    const result = await sendMailForUser(user, { ...payload, bodyHtml: injectTracking(payload.bodyHtml, String(email._id), payload.trackingEnabled) });
    await logAudit("email.sent", String(user._id), { to: payload.to, subject: payload.subject }, String(email._id), req);
    return Response.json({ success: true, messageId: result.messageId, emailId: email._id });
  } catch (error: any) {
    const email = await Email.create({ userId: user._id, ...payload, status: "failed", errorMsg: error.message, sentAt: new Date() });
    await logAudit("email.failed", String(user._id), { to: payload.to, subject: payload.subject, error: error.message }, String(email._id), req);
    return jsonError(`Send failed: ${error.message}`, 400, "SEND_FAILED");
  }
}
