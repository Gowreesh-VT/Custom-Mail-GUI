import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { sendMailForUser } from "@/lib/mailer";
import { jsonError } from "@/lib/utils";
import { Template } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(req);
    const { id } = await params;
    const template = await Template.findOne({ _id: id, userId: user._id });
    if (!template) return jsonError("Template not found", 404);
    await sendMailForUser(user, {
      to: [user.email],
      subject: template.subjectLine || template.subject || template.name,
      bodyHtml: template.bodyHtml
    });
    return Response.json({ success: true });
  } catch (error: any) {
    return jsonError(error.message || "Unable to send test email", 400, "TEMPLATE_TEST_FAILED");
  }
}
