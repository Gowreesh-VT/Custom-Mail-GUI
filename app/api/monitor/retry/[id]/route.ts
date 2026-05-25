import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { sendMailForUser } from "@/lib/mailer";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { emailRecord } from "@/lib/records";
import { toJson } from "@/lib/json-fields";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const email = emailRecord(await prisma.email.findFirst({ where: { id, userId: String(user._id), status: "failed" } }));
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
    await prisma.email.update({
      where: { id },
      data: { status: "sent", errorMsg: null, retryCount: { increment: 1 }, retryHistory: toJson([...email.retryHistory, { attemptedAt: new Date().toISOString(), success: true }]) }
    });
    return Response.json({ success: true });
  } catch (error: any) {
    await prisma.email.update({
      where: { id },
      data: { retryCount: { increment: 1 }, retryHistory: toJson([...email.retryHistory, { attemptedAt: new Date().toISOString(), success: false, error: error.message }]) }
    });
    return jsonError(error.message, 400, "RETRY_FAILED");
  }
}
