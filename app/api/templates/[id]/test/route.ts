import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { sendEmailWithFallback } from "@/lib/mailer";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(req);
    const { id } = await params;
    const template = await prisma.template.findFirst({ where: { id, userId: String(user._id) } });
    if (!template) return jsonError("Template not found", 404);
    const result = await sendEmailWithFallback({
      userId: String(user._id),
      to: [user.email],
      subject: template.subjectLine || template.name,
      html: template.bodyHtml
    });
    if (!result.success) {
      throw new Error(result.error || "Unable to send test email");
    }
    return Response.json({ success: true });
  } catch (error: any) {
    return jsonError(error.message || "Unable to send test email", 400, "TEMPLATE_TEST_FAILED");
  }
}
