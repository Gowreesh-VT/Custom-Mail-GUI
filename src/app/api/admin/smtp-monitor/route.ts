import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin(req);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      smtpHost: true,
      smtpPort: true,
      smtpEncryption: true,
      smtpFallbackEnabled: true,
      smtpSecondaryHost: true,
      smtpSecondaryPort: true,
      smtpHealthLogs: {
        orderBy: { testedAt: "desc" },
        take: 20,
        select: {
          id: true,
          success: true,
          latencyMs: true,
          error: true,
          testedAt: true,
          smtpType: true,
        },
      },
      smtpFallbackLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          emailId: true,
          recipientEmail: true,
          primaryError: true,
          primaryErrorCode: true,
          fallbackUsed: true,
          fallbackSuccess: true,
          fallbackError: true,
          primaryAttemptAt: true,
          fallbackAttemptAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute aggregate metrics per user
  const usersWithMetrics = users.map((user) => {
    const healthLogs = user.smtpHealthLogs;
    const primaryLogs = healthLogs.filter((l) => l.smtpType === "primary");
    const secondaryLogs = healthLogs.filter((l) => l.smtpType === "secondary");

    const primarySuccess = primaryLogs.filter((l) => l.success).length;
    const primaryFailed = primaryLogs.filter((l) => !l.success).length;
    const primaryAvgLatency =
      primaryLogs.filter((l) => l.latencyMs !== null).length > 0
        ? Math.round(
            primaryLogs
              .filter((l) => l.latencyMs !== null)
              .reduce((sum, l) => sum + (l.latencyMs ?? 0), 0) /
              primaryLogs.filter((l) => l.latencyMs !== null).length
          )
        : null;

    const secondarySuccess = secondaryLogs.filter((l) => l.success).length;
    const secondaryFailed = secondaryLogs.filter((l) => !l.success).length;

    const lastHealthLog = healthLogs[0] ?? null;
    const totalFallbacks = user.smtpFallbackLogs.length;
    const fallbackSucceeded = user.smtpFallbackLogs.filter(
      (l) => l.fallbackSuccess
    ).length;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      smtpHost: user.smtpHost,
      smtpPort: user.smtpPort,
      smtpEncryption: user.smtpEncryption,
      fallbackEnabled: user.smtpFallbackEnabled,
      secondaryHost: user.smtpSecondaryHost,
      secondaryPort: user.smtpSecondaryPort,
      lastStatus: lastHealthLog?.success ?? null,
      lastTestedAt: lastHealthLog?.testedAt ?? null,
      lastLatencyMs: lastHealthLog?.latencyMs ?? null,
      primaryStats: {
        tested: primaryLogs.length,
        success: primarySuccess,
        failed: primaryFailed,
        avgLatencyMs: primaryAvgLatency,
      },
      secondaryStats: {
        tested: secondaryLogs.length,
        success: secondarySuccess,
        failed: secondaryFailed,
      },
      fallbackStats: {
        total: totalFallbacks,
        succeeded: fallbackSucceeded,
        failed: totalFallbacks - fallbackSucceeded,
      },
      recentHealthLogs: healthLogs.slice(0, 5),
      recentFallbackLogs: user.smtpFallbackLogs.slice(0, 5),
    };
  });

  // Global summary
  const totalUsers = usersWithMetrics.length;
  const healthyUsers = usersWithMetrics.filter(
    (u) => u.lastStatus === true
  ).length;
  const failingUsers = usersWithMetrics.filter(
    (u) => u.lastStatus === false
  ).length;
  const unconfiguredUsers = usersWithMetrics.filter(
    (u) => !u.smtpHost
  ).length;
  const totalFallbackEvents = usersWithMetrics.reduce(
    (sum, u) => sum + u.fallbackStats.total,
    0
  );

  return Response.json({
    success: true,
    summary: {
      totalUsers,
      healthyUsers,
      failingUsers,
      unconfiguredUsers,
      totalFallbackEvents,
    },
    users: usersWithMetrics,
  });
}
