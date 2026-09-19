import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { jsonSuccess } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth.payload.role !== "admin") return jsonError("Forbidden", 403);
  const body = await req.json();
  const pin = String(body.newPin || "");
  if (!/^\d{4,6}$/.test(pin)) return jsonError("PIN must be 4-6 digits", 400);
  const { id } = await params;
  const operator = await prisma.qrOperator.update({ where: { id }, data: { pinHash: await bcrypt.hash(pin, 12) } });
  await logAudit({ action: "admin.operator_pin_reset", category: "ADMIN", userId: auth.payload.id, metadata: { operatorName: operator.name }, req });
  return jsonSuccess({});
}
