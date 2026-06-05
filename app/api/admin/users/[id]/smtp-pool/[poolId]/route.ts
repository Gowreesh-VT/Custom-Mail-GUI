import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  applyPoolRoleUniqueness,
  buildPoolUpdateData,
  smtpPoolRecord,
  smtpPoolUpdateSchema
} from "@/lib/smtp-pool";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; poolId: string }> }) {
  try {
    const { user: admin } = await requireAdmin(req);
    const { id, poolId } = await params;
    const existing = await prisma.smtpPool.findFirst({ where: { id: poolId, userId: id, isAdminAssigned: true } });
    if (!existing) return jsonError("Admin-assigned SMTP entry not found", 404);

    const body = smtpPoolUpdateSchema.parse(await req.json());
    await applyPoolRoleUniqueness(id, true, body, poolId);
    const updated = await prisma.smtpPool.update({ where: { id: poolId }, data: buildPoolUpdateData(body) });
    await logAudit("admin.smtp_assignment_updated", String(admin._id), { targetUserId: id, label: updated.label }, id, req);
    return Response.json({ success: true, entry: smtpPoolRecord(updated) });
  } catch (error: any) {
    return jsonError(error.message || "Unable to update SMTP assignment", 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; poolId: string }> }) {
  try {
    const { user: admin } = await requireAdmin(req);
    const { id, poolId } = await params;
    const existing = await prisma.smtpPool.findFirst({ where: { id: poolId, userId: id, isAdminAssigned: true } });
    if (!existing) return jsonError("Admin-assigned SMTP entry not found", 404);

    await prisma.smtpPool.delete({ where: { id: poolId } });
    await logAudit("admin.smtp_assignment_removed", String(admin._id), { targetUserId: id, label: existing.label }, id, req);
    return Response.json({ success: true });
  } catch (error: any) {
    return jsonError(error.message || "Unable to remove SMTP assignment", 400);
  }
}
