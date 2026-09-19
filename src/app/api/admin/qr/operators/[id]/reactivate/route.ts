import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { jsonSuccess } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth.payload.role !== "admin") return jsonError("Forbidden", 403);
  const { id } = await params;
  const operator = await prisma.qrOperator.update({ where: { id }, data: { isActive: true } });
  await logAudit({ action: "admin.operator_reactivated", category: "ADMIN", userId: auth.payload.id, metadata: { operatorName: operator.name }, req });
  return jsonSuccess({});
}
