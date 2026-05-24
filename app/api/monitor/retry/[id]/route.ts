import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { sendMailForUser } from "@/lib/mailer";
import { jsonError } from "@/lib/utils";
import { Email } from "@/lib/models";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const email = await Email.findOne({ _id: id, userId: user._id, status: "failed" });
  if (!email) return jsonError("Failed email not found", 404);
  try {
    await sendMailForUser(user, {
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      replyTo: email.replyTo || undefined,
      subject: email.subject,
      bodyHtml: email.bodyHtml,
      attachments: email.attachments as any
    });
    email.status = "sent";
    email.errorMsg = undefined;
    email.retryCount += 1;
    email.retryHistory.push({ attemptedAt: new Date(), success: true });
    await email.save();
    return Response.json({ success: true });
  } catch (error: any) {
    email.retryCount += 1;
    email.retryHistory.push({ attemptedAt: new Date(), success: false, error: error.message });
    await email.save();
    return jsonError(error.message, 400, "RETRY_FAILED");
  }
}
