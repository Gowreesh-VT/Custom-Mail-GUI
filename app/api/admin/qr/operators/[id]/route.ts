import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { jsonSuccess } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const body = await req.json();
  const operator = await prisma.qrOperator.update({
    where: { id },
    data: {
      name: String(body.name || ""),
      email: String(body.email || "").toLowerCase(),
      campaigns: {
        deleteMany: {},
        create: (Array.isArray(body.campaignIds) ? body.campaignIds : []).map((campaignId: string) => ({ campaignId }))
      }
    },
    include: { campaigns: { include: { campaign: true } } }
  });
  await logAudit({ action: "admin.operator_updated", category: "ADMIN", userId: auth.payload.id, metadata: { operatorName: operator.name }, req });
  return jsonSuccess({ operator });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const operator = await prisma.qrOperator.delete({ where: { id } });
  await logAudit({ action: "admin.operator_deleted", category: "ADMIN", userId: auth.payload.id, metadata: { operatorName: operator.name }, req });
  return jsonSuccess({});
}

async function requireAdmin(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.payload.role !== "admin") return jsonError("Forbidden", 403);
  return auth;
}
