import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { sendEmailWithFallback } from "@/lib/mailer";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { emailRecord } from "@/lib/records";
import { toJson } from "@/lib/json-fields";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;

  // Atomically claim the record from "failed" to "sending" to prevent duplicate sends
  const claimed = await prisma.email.updateMany({
    where: { id, userId: String(user._id), status: "failed" },
    data: { status: "sending" }
  });

  if (claimed.count === 0) {
    return jsonError("Email is not in failed state or is already being retried", 409, "ALREADY_RETRIED");
  }

  const email = emailRecord(await prisma.email.findUnique({ where: { id } }));
  if (!email) return jsonError("Email not found", 404);

  try {
    const result = await sendEmailWithFallback({
      userId: String(user._id),
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      replyTo: email.replyTo || undefined,
      subject: email.subject,
      html: email.bodyHtml,
      attachments: email.attachments as any,
      emailId: id
    });
    if (!result.success) {
      throw new Error(result.error || "Retry failed");
    }
    await prisma.email.update({
      where: { id },
      data: {
        status: "sent",
        errorMsg: null,
        retryCount: { increment: 1 },
        usedFallbackSmtp: result.usedFallback,
        retryHistory: toJson([...email.retryHistory, { attemptedAt: new Date().toISOString(), success: true }])
      }
    });
    return Response.json({ success: true });
  } catch (error: any) {
    await prisma.email.update({
      where: { id },
      data: {
        status: "failed",
        errorMsg: error.message,
        retryCount: { increment: 1 },
        retryHistory: toJson([...email.retryHistory, { attemptedAt: new Date().toISOString(), success: false, error: error.message }])
      }
    });
    return jsonError(error.message, 400, "RETRY_FAILED");
  }
}
