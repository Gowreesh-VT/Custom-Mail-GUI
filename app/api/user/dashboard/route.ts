import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";
import { toStringArray } from "@/lib/json-fields";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const userId = String(user._id);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - 7);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 14-day window for daily trend chart
    const chartDays = 14;
    const chartStartDate = new Date(startOfToday);
    chartStartDate.setDate(chartStartDate.getDate() - (chartDays - 1));

    const [
      dbUser,
      globalConfig,
      primaryPool,
      poolCount,
      sentToday,
      sentThisMonth,
      totalSent,
      failedToday,
      failedThisWeek,
      totalFailed,
      scheduledPending,
      draftsCount,
      templatesCount,
      qrCampaignsCount,
      certificatesCount,
      engagementAgg,
      recentEmailsRaw,
      upcomingScheduledRaw,
      recentDraftsRaw,
      trendEmailsRaw
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          dailyLimit: true,
          monthlyLimit: true,
          smtpHost: true,
          smtpPort: true,
          smtpFromName: true,
          smtpFromEmail: true,
          smtpEncryption: true,
          smtpFallbackEnabled: true
        }
      }),
      prisma.systemConfig.findUnique({ where: { id: "singleton" } }),
      prisma.smtpPool.findFirst({
        where: { userId, isPrimary: true, isActive: true },
        select: {
          label: true,
          host: true,
          port: true,
          fromEmail: true,
          encryption: true,
          lastTestedAt: true,
          lastTestSuccess: true,
          lastTestLatency: true
        }
      }),
      prisma.smtpPool.count({ where: { userId, isActive: true } }),
      prisma.email.count({ where: { userId, status: "sent", sentAt: { gte: startOfToday } } }),
      prisma.email.count({ where: { userId, status: "sent", sentAt: { gte: startOfThisMonth } } }),
      prisma.email.count({ where: { userId, status: "sent" } }),
      prisma.email.count({ where: { userId, status: "failed", sentAt: { gte: startOfToday } } }),
      prisma.email.count({ where: { userId, status: "failed", sentAt: { gte: startOfThisWeek } } }),
      prisma.email.count({ where: { userId, status: "failed" } }),
      prisma.scheduledEmail.count({ where: { userId, status: "pending" } }),
      prisma.draft.count({ where: { userId } }),
      prisma.template.count({ where: { userId } }),
      prisma.qrCampaign.count({ where: { userId, isActive: true } }),
      prisma.certificateTemplate.count({ where: { userId, isActive: true } }),
      prisma.email.aggregate({
        where: { userId },
        _sum: { openCount: true, clickCount: true }
      }),
      prisma.email.findMany({
        where: { userId },
        orderBy: { sentAt: "desc" },
        take: 8,
        select: {
          id: true,
          toAddresses: true,
          subject: true,
          status: true,
          isBulk: true,
          sentAt: true,
          openCount: true,
          clickCount: true,
          usedFallbackSmtp: true
        }
      }),
      prisma.scheduledEmail.findMany({
        where: { userId, status: "pending" },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        select: {
          id: true,
          toAddresses: true,
          subject: true,
          scheduledAt: true,
          status: true
        }
      }),
      prisma.draft.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          toAddresses: true,
          subject: true,
          updatedAt: true
        }
      }),
      prisma.email.findMany({
        where: {
          userId,
          sentAt: { gte: chartStartDate }
        },
        select: {
          sentAt: true,
          status: true,
          openCount: true,
          clickCount: true
        }
      })
    ]);

    // Build continuous 14-day timeline
    const dateMap = new Map<string, { date: string; label: string; sent: number; failed: number; opens: number; clicks: number }>();
    for (let i = 0; i < chartDays; i++) {
      const d = new Date(chartStartDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dateMap.set(key, { date: key, label, sent: 0, failed: 0, opens: 0, clicks: 0 });
    }

    for (const email of trendEmailsRaw) {
      const key = new Date(email.sentAt).toISOString().split("T")[0];
      const entry = dateMap.get(key);
      if (entry) {
        if (email.status === "sent") entry.sent += 1;
        else if (email.status === "failed") entry.failed += 1;
        entry.opens += email.openCount || 0;
        entry.clicks += email.clickCount || 0;
      }
    }

    const trendChart = Array.from(dateMap.values());

    // Calculate rates
    const totalAttempts = totalSent + totalFailed;
    const deliverabilityRate = totalAttempts > 0 ? Number(((totalSent / totalAttempts) * 100).toFixed(1)) : 100;
    const totalOpens = engagementAgg._sum.openCount || 0;
    const totalClicks = engagementAgg._sum.clickCount || 0;
    const openRate = totalSent > 0 ? Number(((totalOpens / totalSent) * 100).toFixed(1)) : 0;
    const clickRate = totalSent > 0 ? Number(((totalClicks / totalSent) * 100).toFixed(1)) : 0;

    // Check SMTP relay status
    const isGlobalActive = Boolean(globalConfig?.globalSmtpActive && globalConfig.smtpHost && globalConfig.smtpFromEmail);
    const isUserDirectActive = Boolean(dbUser?.smtpHost && dbUser.smtpFromEmail);
    const isPoolActive = Boolean(primaryPool);
    const smtpConfigured = isGlobalActive || isUserDirectActive || isPoolActive;

    const smtpRelayInfo = primaryPool
      ? {
          label: primaryPool.label,
          host: primaryPool.host,
          port: primaryPool.port,
          fromEmail: primaryPool.fromEmail,
          encryption: primaryPool.encryption,
          lastTestedAt: primaryPool.lastTestedAt,
          lastTestSuccess: primaryPool.lastTestSuccess,
          lastTestLatency: primaryPool.lastTestLatency,
          isPool: true
        }
      : dbUser?.smtpHost
      ? {
          label: "Primary Relay",
          host: dbUser.smtpHost,
          port: dbUser.smtpPort || 587,
          fromEmail: dbUser.smtpFromEmail || "",
          encryption: dbUser.smtpEncryption || "TLS",
          lastTestedAt: null,
          lastTestSuccess: null,
          lastTestLatency: null,
          isPool: false
        }
      : isGlobalActive
      ? {
          label: "Global Cluster Relay",
          host: globalConfig?.smtpHost || "",
          port: globalConfig?.smtpPort || 587,
          fromEmail: globalConfig?.smtpFromEmail || "",
          encryption: globalConfig?.smtpEncryption || "TLS",
          lastTestedAt: null,
          lastTestSuccess: null,
          lastTestLatency: null,
          isPool: false
        }
      : null;

    // Format lists
    const recentEmails = recentEmailsRaw.map((e) => ({
      id: e.id,
      to: toStringArray(e.toAddresses),
      subject: e.subject || "(no subject)",
      status: e.status,
      isBulk: e.isBulk,
      sentAt: e.sentAt,
      openCount: e.openCount,
      clickCount: e.clickCount,
      usedFallbackSmtp: e.usedFallbackSmtp
    }));

    const upcomingScheduled = upcomingScheduledRaw.map((s) => ({
      id: s.id,
      to: toStringArray(s.toAddresses),
      subject: s.subject || "(no subject)",
      scheduledAt: s.scheduledAt,
      status: s.status
    }));

    const recentDrafts = recentDraftsRaw.map((d) => ({
      id: d.id,
      to: toStringArray(d.toAddresses),
      subject: d.subject || "(untitled draft)",
      updatedAt: d.updatedAt
    }));

    return Response.json({
      success: true,
      user: {
        id: dbUser?.id,
        name: dbUser?.name,
        email: dbUser?.email,
        role: dbUser?.role,
        dailyLimit: dbUser?.dailyLimit || 0,
        monthlyLimit: dbUser?.monthlyLimit || 0
      },
      smtpStatus: {
        isConfigured: smtpConfigured,
        relayInfo: smtpRelayInfo,
        poolCount
      },
      stats: {
        sentToday,
        sentThisMonth,
        totalSent,
        failedToday,
        failedThisWeek,
        totalFailed,
        scheduledPending,
        draftsCount,
        templatesCount,
        qrCampaignsCount,
        certificatesCount,
        totalOpens,
        totalClicks,
        deliverabilityRate,
        openRate,
        clickRate,
        dailyLimit: dbUser?.dailyLimit || 0,
        monthlyLimit: dbUser?.monthlyLimit || 0
      },
      trendChart,
      recentEmails,
      upcomingScheduled,
      recentDrafts
    });
  } catch (error: any) {
    return jsonError(error.message || "Failed to load dashboard data", 500);
  }
}
