import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  applyPoolRoleUniqueness,
  buildPoolCreateData,
  smtpPoolCreateSchema,
  smtpPoolRecord
} from "@/lib/smtp-pool";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const entries = await prisma.smtpPool.findMany({
      where: { userId: id },
      orderBy: [{ isAdminAssigned: "desc" }, { isPrimary: "desc" }, { isFallback: "desc" }, { createdAt: "desc" }]
    });
    return Response.json({ success: true, entries: entries.map(smtpPoolRecord) });
  } catch (error: any) {
    return jsonError(error.message || "Unable to load user SMTP pool", 400);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user: admin } = await requireAdmin(req);
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!target) return jsonError("User not found", 404);
    const body = smtpPoolCreateSchema.parse(await req.json());

    await applyPoolRoleUniqueness(id, true, body);
    const created = await prisma.smtpPool.create({
      data: buildPoolCreateData(id, body, true)
    });

    await logAudit("admin.smtp_assigned_to_user", String(admin._id), {
      targetUserId: target.id,
      targetUserName: target.name,
      label: created.label,
      host: created.host,
      isPrimary: created.isPrimary,
      isFallback: created.isFallback
    }, target.id, req);

    return Response.json({ success: true, entry: smtpPoolRecord(created) });
  } catch (error: any) {
    return jsonError(error.message || "Unable to assign SMTP", 400);
  }
}
