import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { auditRecord, userRecord } from "@/lib/records";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.payload.role !== "admin") throw new Error("Forbidden");
  return auth;
}

type AnomalyFlag = {
  type: "high_volume" | "login_brute_force" | "late_admin_role";
  message: string;
  affectedLogIds: string[];
};

function detectAnomalies(logs: any[]): AnomalyFlag[] {
  const anomalies: AnomalyFlag[] = [];

  // 1. More than 200 emails sent within 2 minutes by same user
  const emailLogs = logs.filter((l) => l.action === "email.sent");
  const emailByUser: Record<string, typeof emailLogs> = {};
  for (const log of emailLogs) {
    if (!emailByUser[log.userId]) emailByUser[log.userId] = [];
    emailByUser[log.userId].push(log);
  }
  for (const [, userLogs] of Object.entries(emailByUser)) {
    const sorted = [...userLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (let i = 0; i < sorted.length; i++) {
      const window = sorted.filter(
        (l) => Math.abs(new Date(l.createdAt).getTime() - new Date(sorted[i].createdAt).getTime()) <= 2 * 60 * 1000
      );
      if (window.length > 200) {
        anomalies.push({
          type: "high_volume",
          message: `${sorted[i].userName} sent ${window.length} emails within 2 minutes — possible spam burst`,
          affectedLogIds: window.map((l) => l.id)
        });
        break;
      }
    }
  }

  // 2. 5+ failed login attempts from same IP within 10 minutes
  const failedLogins = logs.filter((l) => l.action === "user.login_failed");
  const failedByIp: Record<string, typeof failedLogins> = {};
  for (const log of failedLogins) {
    const ip = log.ip || "unknown";
    if (!failedByIp[ip]) failedByIp[ip] = [];
    failedByIp[ip].push(log);
  }
  for (const [ip, ipLogs] of Object.entries(failedByIp)) {
    if (ip === "unknown") continue;
    const sorted = [...ipLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (let i = 0; i < sorted.length; i++) {
      const window = sorted.filter(
        (l) => Math.abs(new Date(l.createdAt).getTime() - new Date(sorted[i].createdAt).getTime()) <= 10 * 60 * 1000
      );
      if (window.length >= 5) {
        anomalies.push({
          type: "login_brute_force",
          message: `${window.length} failed login attempts from IP ${ip} within 10 minutes — possible brute force`,
          affectedLogIds: window.map((l) => l.id)
        });
        break;
      }
    }
  }

  // 3. Admin role assignment between 11pm–5am server time
  const adminRoleLogs = logs.filter((l) => l.action === "admin.user_role_changed" || l.action === "admin.user_updated");
  for (const log of adminRoleLogs) {
    const hour = new Date(log.createdAt).getHours();
    if (hour >= 23 || hour < 5) {
      anomalies.push({
        type: "late_admin_role",
        message: `Admin role change detected at ${new Date(log.createdAt).toLocaleTimeString()} — unusual off-hours activity`,
        affectedLogIds: [log.id]
      });
    }
  }

  return anomalies;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch {
    return jsonError("Forbidden", 403);
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const userId = url.searchParams.get("userId");
  const q = url.searchParams.get("q");
  const actions = url.searchParams.get("actions"); // comma-separated
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const limit = Number(url.searchParams.get("limit") || "500");

  const actionList = actions ? actions.split(",").map((a) => a.trim()).filter(Boolean) : [];

  const where: any = {
    ...(category && category !== "all" ? { category: category.toUpperCase() } : {}),
    ...(userId && userId !== "all" ? { userId } : {}),
    ...(actionList.length > 0 ? { action: { in: actionList } } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {})
          }
        }
      : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" as const } },
            { userName: { contains: q, mode: "insensitive" as const } },
            { targetName: { contains: q, mode: "insensitive" as const } },
            { metadata: { contains: q, mode: "insensitive" as const } }
          ]
        }
      : {})
  };

  const [logs, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 1000)
    }),
    prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: "asc" } })
  ]);

  const mappedLogs = logs.map(auditRecord);
  const anomalies = detectAnomalies(mappedLogs);

  return Response.json({ success: true, logs: mappedLogs, users: users.map(userRecord), anomalies });
}
