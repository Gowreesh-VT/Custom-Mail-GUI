import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const days = Number(new URL(req.url).searchParams.get("days") || 30);
  const since = new Date(); since.setDate(since.getDate() - days + 1); since.setHours(0, 0, 0, 0);
  const volumeRows = await prisma.$queryRaw<{ day: string; status: string; count: bigint }[]>`
    SELECT TO_CHAR(DATE("sentAt"), 'YYYY-MM-DD') AS day, status, COUNT(*) AS count
    FROM "Email"
    WHERE "sentAt" >= ${since}
    GROUP BY DATE("sentAt"), status
    ORDER BY DATE("sentAt") ASC
  `;
  const volume = volumeRows.map((row) => ({ _id: { day: row.day, status: row.status }, count: Number(row.count) }));
  const grouped = await prisma.email.groupBy({ by: ["userId", "status"], where: { sentAt: { gte: since } }, _count: { _all: true } });
  const users = await prisma.user.findMany({ where: { id: { in: grouped.map((row) => row.userId) } }, select: { id: true, name: true } });
  const userMap = new Map(users.map((user) => [user.id, user.name]));
  const byUserMap = new Map<string, { _id: string; name?: string; sent: number; failed: number }>();
  for (const row of grouped) {
    const item = byUserMap.get(row.userId) ?? { _id: row.userId, name: userMap.get(row.userId), sent: 0, failed: 0 };
    if (row.status === "sent") item.sent += row._count._all;
    if (row.status === "failed") item.failed += row._count._all;
    byUserMap.set(row.userId, item);
  }
  const byUser = Array.from(byUserMap.values()).sort((a, b) => b.sent - a.sent).slice(0, 20);
  const statusRows = await prisma.email.groupBy({ by: ["status"], _count: { _all: true } });
  const status = statusRows.map((row) => ({ _id: row.status, value: row._count._all }));
  return Response.json({ success: true, volume, byUser, status });
}
