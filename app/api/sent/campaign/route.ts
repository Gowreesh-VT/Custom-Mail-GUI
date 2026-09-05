import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim().toLowerCase() || "";

    // Group emails by bulkJobId for this user
    const distinctGroups = await prisma.email.groupBy({
      by: ["bulkJobId"],
      where: {
        userId: String(user._id),
        bulkJobId: { not: null }
      },
      _count: {
        id: true
      },
      _min: {
        sentAt: true
      },
      _max: {
        sentAt: true
      },
      _sum: {
        openCount: true,
        clickCount: true
      },
      orderBy: {
        _max: {
          sentAt: "desc"
        }
      }
    });

    const validGroups = distinctGroups.filter(
      (g) => g.bulkJobId && g.bulkJobId.trim().length > 0
    );

    if (validGroups.length === 0) {
      return Response.json({
        success: true,
        campaigns: [],
        summary: {
          totalCampaigns: 0,
          totalEmails: 0,
          totalSuccessful: 0,
          totalFailed: 0,
          avgDeliveryRate: 0,
          avgOpenRate: 0,
          avgClickRate: 0
        }
      });
    }

    const jobIds = validGroups.map((g) => g.bulkJobId as string);

    // Fetch representative emails for subject and template metadata
    const representativeEmails = await prisma.email.findMany({
      where: {
        userId: String(user._id),
        bulkJobId: { in: jobIds }
      },
      distinct: ["bulkJobId"],
      select: {
        bulkJobId: true,
        subject: true,
        templateName: true,
        templateId: true,
        sentAt: true
      }
    });
    const repMap = new Map<string, typeof representativeEmails[0]>();
    for (const r of representativeEmails) {
      if (r.bulkJobId) repMap.set(r.bulkJobId, r);
    }

    // Fetch status counts per bulkJobId
    const statusCounts = await prisma.email.groupBy({
      by: ["bulkJobId", "status"],
      where: {
        userId: String(user._id),
        bulkJobId: { in: jobIds }
      },
      _count: {
        id: true
      }
    });
    const successCountMap = new Map<string, number>();
    const failedCountMap = new Map<string, number>();
    for (const sc of statusCounts) {
      if (!sc.bulkJobId) continue;
      if (sc.status === "sent") {
        successCountMap.set(sc.bulkJobId, sc._count.id);
      } else if (sc.status === "failed") {
        failedCountMap.set(sc.bulkJobId, sc._count.id);
      }
    }

    // Fetch distinct opened emails count (openCount > 0)
    const openedCounts = await prisma.email.groupBy({
      by: ["bulkJobId"],
      where: {
        userId: String(user._id),
        bulkJobId: { in: jobIds },
        openCount: { gt: 0 }
      },
      _count: {
        id: true
      }
    });
    const openedCountMap = new Map<string, number>();
    for (const oc of openedCounts) {
      if (oc.bulkJobId) openedCountMap.set(oc.bulkJobId, oc._count.id);
    }

    // Fetch distinct clicked emails count (clickCount > 0)
    const clickedCounts = await prisma.email.groupBy({
      by: ["bulkJobId"],
      where: {
        userId: String(user._id),
        bulkJobId: { in: jobIds },
        clickCount: { gt: 0 }
      },
      _count: {
        id: true
      }
    });
    const clickedCountMap = new Map<string, number>();
    for (const cc of clickedCounts) {
      if (cc.bulkJobId) clickedCountMap.set(cc.bulkJobId, cc._count.id);
    }

    let campaigns = validGroups.map((g) => {
      const jobId = g.bulkJobId!;
      const rep = repMap.get(jobId);
      const totalRecipients = g._count.id || 0;
      const successfulCount = successCountMap.get(jobId) || 0;
      const failedCount = failedCountMap.get(jobId) || 0;
      const openedCount = openedCountMap.get(jobId) || 0;
      const clickedCount = clickedCountMap.get(jobId) || 0;
      const totalOpens = g._sum.openCount || 0;
      const totalClicks = g._sum.clickCount || 0;

      const deliveryRate = totalRecipients > 0 ? (successfulCount / totalRecipients) * 100 : 0;
      const openRate = successfulCount > 0 ? (openedCount / successfulCount) * 100 : 0;
      const clickRate = successfulCount > 0 ? (clickedCount / successfulCount) * 100 : 0;

      return {
        bulkJobId: jobId,
        subject: rep?.subject || "Untitled Campaign",
        templateName: rep?.templateName || "Custom Template",
        templateId: rep?.templateId || null,
        sentAt: (g._min.sentAt || rep?.sentAt || new Date()).toISOString(),
        lastSentAt: (g._max.sentAt || rep?.sentAt || new Date()).toISOString(),
        totalRecipients,
        successfulCount,
        failedCount,
        openedCount,
        clickedCount,
        totalOpens,
        totalClicks,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        openRate: Math.round(openRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10
      };
    });

    // Optional search filter
    if (q) {
      campaigns = campaigns.filter((c) =>
        c.subject.toLowerCase().includes(q) ||
        c.templateName.toLowerCase().includes(q) ||
        c.bulkJobId.toLowerCase().includes(q)
      );
    }

    // Compute aggregate summary
    const totalCampaigns = campaigns.length;
    const totalEmails = campaigns.reduce((acc, c) => acc + c.totalRecipients, 0);
    const totalSuccessful = campaigns.reduce((acc, c) => acc + c.successfulCount, 0);
    const totalFailed = campaigns.reduce((acc, c) => acc + c.failedCount, 0);
    const totalOpened = campaigns.reduce((acc, c) => acc + c.openedCount, 0);
    const totalClicked = campaigns.reduce((acc, c) => acc + c.clickedCount, 0);

    const avgDeliveryRate = totalEmails > 0 ? (totalSuccessful / totalEmails) * 100 : 0;
    const avgOpenRate = totalSuccessful > 0 ? (totalOpened / totalSuccessful) * 100 : 0;
    const avgClickRate = totalSuccessful > 0 ? (totalClicked / totalSuccessful) * 100 : 0;

    return Response.json({
      success: true,
      campaigns,
      summary: {
        totalCampaigns,
        totalEmails,
        totalSuccessful,
        totalFailed,
        avgDeliveryRate: Math.round(avgDeliveryRate * 10) / 10,
        avgOpenRate: Math.round(avgOpenRate * 10) / 10,
        avgClickRate: Math.round(avgClickRate * 10) / 10
      }
    });
  } catch (error: any) {
    return jsonError(error.message || "Failed to fetch campaigns", 500);
  }
}
