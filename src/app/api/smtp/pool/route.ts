import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
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

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const entries = await prisma.smtpPool.findMany({
      where: { userId: String(user._id), isAdminAssigned: false },
      orderBy: [{ isPrimary: "desc" }, { isFallback: "desc" }, { createdAt: "desc" }]
    });
    return Response.json({ success: true, entries: entries.map(smtpPoolRecord) });
  } catch (error: any) {
    return jsonError(error.message || "Unable to load SMTP pool", error.message === "User not found" ? 401 : 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = smtpPoolCreateSchema.parse(await req.json());
    const userId = String(user._id);

    await applyPoolRoleUniqueness(userId, false, body);
    const created = await prisma.smtpPool.create({
      data: buildPoolCreateData(userId, body, false)
    });

    await logAudit("smtp.pool_entry_added", userId, {
      label: created.label,
      host: created.host,
      isPrimary: created.isPrimary,
      isFallback: created.isFallback
    }, undefined, req);

    return Response.json({ success: true, entry: smtpPoolRecord(created) });
  } catch (error: any) {
    return jsonError(error.message || "Unable to add SMTP server", 400);
  }
}
