import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  dailyLimit: z.number().min(0),
  monthlyLimit: z.number().min(0),
});

export async function GET(req: NextRequest) {
  await requireAdmin(req);

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      dailyLimit: true,
      monthlyLimit: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch email counts for all users in parallel
  const userIds = users.map((u) => u.id);

  const [dailySentCounts, monthlySentCounts, totalSentCounts, failedCounts] =
    await Promise.all([
      // Sent today per user
      prisma.email.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, status: "sent", sentAt: { gte: startOfDay } },
        _count: { id: true },
      }),
      // Sent this month per user
      prisma.email.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, status: "sent", sentAt: { gte: startOfMonth } },
        _count: { id: true },
      }),
      // Total sent per user
      prisma.email.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, status: "sent" },
        _count: { id: true },
      }),
      // Total failed per user
      prisma.email.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, status: "failed" },
        _count: { id: true },
      }),
    ]);

  const dailyMap = Object.fromEntries(
    dailySentCounts.map((r) => [r.userId, r._count.id])
  );
  const monthlyMap = Object.fromEntries(
    monthlySentCounts.map((r) => [r.userId, r._count.id])
  );
  const totalMap = Object.fromEntries(
    totalSentCounts.map((r) => [r.userId, r._count.id])
  );
  const failedMap = Object.fromEntries(
    failedCounts.map((r) => [r.userId, r._count.id])
  );

  const usersWithUsage = users.map((user) => {
    const sentToday = dailyMap[user.id] ?? 0;
    const sentThisMonth = monthlyMap[user.id] ?? 0;
    const sentTotal = totalMap[user.id] ?? 0;
    const failedTotal = failedMap[user.id] ?? 0;

    const dailyUsagePct =
      user.dailyLimit > 0
        ? Math.min(Math.round((sentToday / user.dailyLimit) * 100), 100)
        : null;
    const monthlyUsagePct =
      user.monthlyLimit > 0
        ? Math.min(Math.round((sentThisMonth / user.monthlyLimit) * 100), 100)
        : null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      dailyLimit: user.dailyLimit,
      monthlyLimit: user.monthlyLimit,
      sentToday,
      sentThisMonth,
      sentTotal,
      failedTotal,
      dailyUsagePct,
      monthlyUsagePct,
      createdAt: user.createdAt,
    };
  });

  return Response.json({ success: true, users: usersWithUsage });
}

export async function PUT(req: NextRequest) {
  const { user: admin } = await requireAdmin(req);
  const url = new URL(req.url);
  const targetId = url.searchParams.get("id");
  if (!targetId) return jsonError("Missing user id", 400);

  const body = updateSchema.parse(await req.json());

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { dailyLimit: body.dailyLimit, monthlyLimit: body.monthlyLimit },
  });

  await logAudit(
    "admin.quota_updated",
    String(admin._id),
    { dailyLimit: body.dailyLimit, monthlyLimit: body.monthlyLimit },
    targetId,
    req
  );

  return Response.json({
    success: true,
    user: { id: updated.id, dailyLimit: updated.dailyLimit, monthlyLimit: updated.monthlyLimit },
  });
}
