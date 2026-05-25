import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { sendMailForUser } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { emailRecord } from "@/lib/records";
import { toJson } from "@/lib/json-fields";

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const { days = 7 } = await req.json().catch(() => ({ days: 7 }));
  const since = new Date();
  since.setDate(since.getDate() - Number(days));
  const emails = (await prisma.email.findMany({ where: { userId: String(user._id), status: "failed", acknowledged: false, sentAt: { gte: since } }, take: 50 })).map(emailRecord);
  const results = [];
  for (const email of emails) {
    try {
      await sendMailForUser(user, { to: email.to, cc: email.cc, bcc: email.bcc, replyTo: email.replyTo || undefined, subject: email.subject, bodyHtml: email.bodyHtml, attachments: email.attachments as any });
      const retryHistory = [...email.retryHistory, { attemptedAt: new Date().toISOString(), success: true }];
      await prisma.email.update({ where: { id: email.id }, data: { status: "sent", errorMsg: null, retryCount: { increment: 1 }, retryHistory: toJson(retryHistory) } });
      results.push({ id: email.id, success: true });
    } catch (error: any) {
      const retryHistory = [...email.retryHistory, { attemptedAt: new Date().toISOString(), success: false, error: error.message }];
      await prisma.email.update({ where: { id: email.id }, data: { retryCount: { increment: 1 }, retryHistory: toJson(retryHistory) } });
      results.push({ id: email.id, success: false, error: error.message });
    }
  }
  return Response.json({ success: true, results });
}
