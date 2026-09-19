import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { emailRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const seven = new Date(now); seven.setDate(now.getDate() - 7);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const [totalUsers, emailsToday, emailsTotal, failed7, scheduledPending, bulkMonth, activeUsers, inactiveUsers] = await Promise.all([
    prisma.user.count(),
    prisma.email.count({ where: { status: "sent", sentAt: { gte: today } } }),
    prisma.email.count({ where: { status: "sent" } }),
    prisma.email.count({ where: { status: "failed", sentAt: { gte: seven } } }),
    prisma.scheduledEmail.count({ where: { status: "pending" } }),
    prisma.email.count({ where: { isBulk: true, sentAt: { gte: month } } }),
    prisma.user.count({ where: { isActive: { not: false } } }),
    prisma.user.count({ where: { isActive: false } })
  ]);
  const recent = (await prisma.email.findMany({ orderBy: { sentAt: "desc" }, take: 50, include: { user: { select: { id: true, name: true, email: true } } } })).map(emailRecord);
  const topRows = await prisma.email.groupBy({ by: ["userId"], where: { status: "sent", sentAt: { gte: month } }, _count: { _all: true }, orderBy: { _count: { userId: "desc" } }, take: 5 });
  const users = await prisma.user.findMany({ where: { id: { in: topRows.map((row) => row.userId) } }, select: { id: true, name: true, email: true } });
  const userMap = new Map(users.map((user) => [user.id, user]));
  const top = topRows.map((row) => ({ _id: row.userId, sent: row._count._all, name: userMap.get(row.userId)?.name, email: userMap.get(row.userId)?.email }));
  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, email: true, createdAt: true }
  });
  return Response.json({ success: true, stats: { totalUsers, activeUsers, inactiveUsers, emailsToday, emailsTotal, failed7, scheduledPending, bulkMonth }, recent, top, recentUsers });
}
