import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { sendMailForUser } from "@/lib/mailer";
import { Email } from "@/models/Email";

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const { days = 7 } = await req.json().catch(() => ({ days: 7 }));
  const since = new Date();
  since.setDate(since.getDate() - Number(days));
  const emails = await Email.find({ userId: user._id, status: "failed", acknowledged: false, sentAt: { $gte: since } }).limit(50);
  const results = [];
  for (const email of emails) {
    try {
      await sendMailForUser(user, { to: email.to, cc: email.cc, bcc: email.bcc, replyTo: email.replyTo || undefined, subject: email.subject, bodyHtml: email.bodyHtml, attachments: email.attachments as any });
      email.status = "sent";
      email.errorMsg = undefined;
      email.retryHistory.push({ attemptedAt: new Date(), success: true });
      results.push({ id: email._id, success: true });
    } catch (error: any) {
      email.retryHistory.push({ attemptedAt: new Date(), success: false, error: error.message });
      results.push({ id: email._id, success: false, error: error.message });
    }
    email.retryCount += 1;
    await email.save();
  }
  return Response.json({ success: true, results });
}
