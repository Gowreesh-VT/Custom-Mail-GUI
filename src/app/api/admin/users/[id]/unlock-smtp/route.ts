import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user: admin } = await requireAdmin(req);
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!target) return jsonError("User not found", 404);

    await prisma.user.update({ where: { id }, data: { adminSmtpLocked: false } });
    await logAudit("admin.smtp_unlocked_for_user", String(admin._id), {
      targetUserId: target.id,
      targetUserName: target.name
    }, target.id, req);
    return Response.json({ success: true });
  } catch (error: any) {
    return jsonError(error.message || "Unable to unlock SMTP", 400);
  }
}
