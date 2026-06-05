import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(req);
    const { id } = await params;
    const userId = String(user._id);
    const entry = await prisma.smtpPool.findFirst({ where: { id, userId, isAdminAssigned: false } });
    if (!entry) return jsonError("SMTP entry not found", 404);
    if (entry.isFallback) return jsonError("Fallback SMTP cannot also be primary", 400);

    const oldPrimary = await prisma.smtpPool.findFirst({ where: { userId, isAdminAssigned: false, isPrimary: true } });
    await prisma.smtpPool.updateMany({ where: { userId, isAdminAssigned: false }, data: { isPrimary: false } });
    await prisma.smtpPool.update({ where: { id }, data: { isPrimary: true } });
    await logAudit("smtp.primary_changed", userId, { oldLabel: oldPrimary?.label, newLabel: entry.label }, undefined, req);
    return Response.json({ success: true });
  } catch (error: any) {
    return jsonError(error.message || "Unable to set primary SMTP", 400);
  }
}
