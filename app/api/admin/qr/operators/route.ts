import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { jsonSuccess } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const operators = await prisma.qrOperator.findMany({ include: { campaigns: { include: { campaign: true } }, _count: { select: { scanLogs: true } } }, orderBy: { createdAt: "desc" } });
  return jsonSuccess({ operators });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const pin = String(body.pin || "");
    if (!name) return jsonError("Name is required", 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Valid email is required", 400);
    if (!/^\d{4,6}$/.test(pin)) return jsonError("PIN must be 4-6 digits", 400);

    const campaignIds = Array.isArray(body.campaignIds) ? Array.from(new Set(body.campaignIds.map((id: string) => String(id)))) : [];
    const operator = await prisma.qrOperator.create({
      data: {
        name,
        email,
        pinHash: await bcrypt.hash(pin, 12),
        createdBy: auth.payload.id,
        campaigns: { create: campaignIds.map((campaignId: string) => ({ campaignId })) }
      },
      include: { campaigns: { include: { campaign: true } } }
    });
    await logAudit({ action: "admin.operator_created", category: "ADMIN", userId: auth.payload.id, metadata: { operatorName: operator.name, email: operator.email }, req });
    return jsonSuccess({ operator });
  } catch (error: any) {
    if (error?.code === "P2002") return jsonError("An operator with this email already exists", 409);
    return jsonError(error?.message || "Failed to create operator", 500);
  }
}

async function requireAdmin(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.payload.role !== "admin") return jsonError("Forbidden", 403);
  return auth;
}
