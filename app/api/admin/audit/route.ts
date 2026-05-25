import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { auditRecord, userRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const userId = url.searchParams.get("userId");
  const q = url.searchParams.get("q");
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(category && category !== "all" ? { category: category.toUpperCase() } : {}),
      ...(userId && userId !== "all" ? { userId } : {}),
      ...(q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { userName: { contains: q, mode: "insensitive" } }, { targetName: { contains: q, mode: "insensitive" } }] } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 500
  });
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } });
  return Response.json({ success: true, logs: logs.map(auditRecord), users: users.map(userRecord) });
}
