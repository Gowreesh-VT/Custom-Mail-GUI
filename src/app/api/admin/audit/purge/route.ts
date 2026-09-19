import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.payload.role !== "admin") throw new Error("Forbidden");
  return auth;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    // Get retention policy
    const policy = await prisma.retentionPolicy.findUnique({ where: { id: "singleton" } });
    const days = policy?.days ?? 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } }
    });

    return Response.json({
      success: true,
      deleted: result.count,
      cutoff: cutoff.toISOString(),
      days
    });
  } catch (error: any) {
    return jsonError(error.message || "Forbidden", 403);
  }
}
