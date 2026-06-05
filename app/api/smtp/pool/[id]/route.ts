import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  applyPoolRoleUniqueness,
  buildPoolUpdateData,
  smtpPoolRecord,
  smtpPoolUpdateSchema
} from "@/lib/smtp-pool";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(req);
    const { id } = await params;
    const userId = String(user._id);
    const existing = await prisma.smtpPool.findFirst({ where: { id, userId, isAdminAssigned: false } });
    if (!existing) return jsonError("SMTP entry not found", 404);

    const body = smtpPoolUpdateSchema.parse(await req.json());
    await applyPoolRoleUniqueness(userId, false, body, id);
    const updated = await prisma.smtpPool.update({
      where: { id },
      data: buildPoolUpdateData(body)
    });

    await logAudit("smtp.pool_entry_updated", userId, {
      label: updated.label,
      changes: Object.keys(body)
    }, undefined, req);

    return Response.json({ success: true, entry: smtpPoolRecord(updated) });
  } catch (error: any) {
    return jsonError(error.message || "Unable to update SMTP server", 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(req);
    const { id } = await params;
    const userId = String(user._id);
    const existing = await prisma.smtpPool.findFirst({ where: { id, userId, isAdminAssigned: false } });
    if (!existing) return jsonError("SMTP entry not found", 404);

    await prisma.smtpPool.delete({ where: { id } });
    await logAudit("smtp.pool_entry_deleted", userId, {
      label: existing.label,
      wasPrimary: existing.isPrimary,
      wasFallback: existing.isFallback
    }, undefined, req);

    return Response.json({
      success: true,
      ...(existing.isPrimary
        ? { warning: "Primary SMTP removed. Please assign a new primary." }
        : {})
    });
  } catch (error: any) {
    return jsonError(error.message || "Unable to delete SMTP server", 400);
  }
}
