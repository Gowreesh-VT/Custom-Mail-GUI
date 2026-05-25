import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin(req);
  const { id } = await params;
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await logAudit("admin.user_deactivated", String(user._id), {}, id, req);
  return Response.json({ success: true });
}
