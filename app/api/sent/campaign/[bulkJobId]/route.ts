import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

function parseUserAgent(ua: string) {
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let device = "Desktop";

  if (!ua) return { browser, os, device };
  const lower = ua.toLowerCase();

  // Simple Device classification
  if (/mobile|android|iphone|ipad|phone/i.test(lower)) {
    device = "Mobile";
  } else if (/tablet|playbook|silk/i.test(lower)) {
    device = "Tablet";
  }

  // Simple Browser classification
  if (lower.includes("firefox")) {
    browser = "Firefox";
  } else if (lower.includes("chrome") && !lower.includes("chromium")) {
    browser = "Chrome";
  } else if (lower.includes("safari") && !lower.includes("chrome")) {
    browser = "Safari";
  } else if (lower.includes("edge")) {
    browser = "Edge";
  } else if (lower.includes("opera") || lower.includes("opr")) {
    browser = "Opera";
  }

  // Simple OS classification
  if (lower.includes("windows")) {
    os = "Windows";
  } else if (lower.includes("macintosh") || lower.includes("mac os") || lower.includes("os x")) {
    os = "macOS";
  } else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ipod")) {
    os = "iOS";
  } else if (lower.includes("android")) {
    os = "Android";
  } else if (lower.includes("linux")) {
    os = "Linux";
  }

  return { browser, os, device };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ bulkJobId: string }> }) {
  try {
    const { user } = await requireUser(req);
    const { bulkJobId } = await params;

    // Fetch all emails in the campaign
    const emails = await prisma.email.findMany({
      where: { bulkJobId },
      orderBy: { sentAt: "asc" }
    });

    if (emails.length === 0) {
      return jsonError("Campaign not found or has no emails", 404);
    }

    // Verify permission
    if (emails[0].userId !== String(user._id) && user.role !== "admin") {
      return jsonError("Forbidden", 403);
    }

    const emailIds = emails.map((e) => e.id);

    // Fetch all events
    const [events, clickEvents] = await Promise.all([
      prisma.emailEvent.findMany({
        where: { emailId: { in: emailIds } },
        orderBy: { timestamp: "asc" }
      }),
      prisma.clickEvent.findMany({
        where: { emailId: { in: emailIds } },
        orderBy: { timestamp: "asc" }
      })
    ]);

    // Aggregate overall metrics
    const totalSent = emails.length;
    const totalSuccessful = emails.filter((e) => e.status === "sent").length;
    const totalFailed = emails.filter((e) => e.status === "failed").length;
    const totalOpened = emails.filter((e) => e.openCount > 0).length;
    const totalClicked = emails.filter((e) => e.clickCount > 0).length;

    // Device, Browser, OS aggregation
    const deviceStats: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const browserStats: Record<string, number> = {};
    const osStats: Record<string, number> = {};

    for (const ev of events) {
      const { device, browser, os } = parseUserAgent(ev.userAgent || "");
      deviceStats[device] = (deviceStats[device] || 0) + 1;
      browserStats[browser] = (browserStats[browser] || 0) + 1;
      osStats[os] = (osStats[os] || 0) + 1;
    }

    // Group clicks by link (label + url)
    const linkStats: Record<string, { label: string; url: string; clicks: number; uniqueIps: Set<string> }> = {};
    for (const cl of clickEvents) {
      const key = `${cl.label}::${cl.url}`;
      if (!linkStats[key]) {
        linkStats[key] = { label: cl.label, url: cl.url, clicks: 0, uniqueIps: new Set<string>() };
      }
      linkStats[key].clicks += 1;
      if (cl.ip) {
        linkStats[key].uniqueIps.add(cl.ip);
      }
    }

    const clickBreakdown = Object.values(linkStats).map((item) => ({
      label: item.label,
      url: item.url,
      clicks: item.clicks,
      uniqueClicks: item.uniqueIps.size
    }));

    // Generate Hourly Time Series buckets
    // Find the campaign start time
    const startCampaign = emails[0].sentAt;
    const timeSeriesMap: Record<string, { time: string; opens: number; clicks: number }> = {};

    // Helper to format key: e.g. "May 29, 21:00"
    const getHourKey = (date: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${date.toLocaleString("default", { month: "short" })} ${date.getDate()}, ${pad(date.getHours())}:00`;
    };

    // Initialize 24 hourly buckets from campaign start
    for (let i = 0; i < 24; i++) {
      const d = new Date(startCampaign.getTime() + i * 60 * 60 * 1000);
      const key = getHourKey(d);
      timeSeriesMap[key] = { time: key, opens: 0, clicks: 0 };
    }

    // Fill buckets
    for (const ev of events) {
      if (ev.type === "open") {
        const key = getHourKey(ev.timestamp);
        if (timeSeriesMap[key]) {
          timeSeriesMap[key].opens += 1;
        } else {
          // If past the initial 24h, create dynamically
          timeSeriesMap[key] = { time: key, opens: 1, clicks: 0 };
        }
      }
    }

    for (const cl of clickEvents) {
      const key = getHourKey(cl.timestamp);
      if (timeSeriesMap[key]) {
        timeSeriesMap[key].clicks += 1;
      } else {
        timeSeriesMap[key] = { time: key, opens: 0, clicks: 1 };
      }
    }

    // Sort time series chronologically by parsing date representation or simply taking keys in insertion/time order
    const timeSeries = Object.values(timeSeriesMap);

    // Recipient list details
    const recipients = emails.map((e) => ({
      id: e.id,
      email: JSON.parse(e.toAddresses)[0] || "",
      status: e.status,
      openCount: e.openCount,
      clickCount: e.clickCount,
      sentAt: e.sentAt.toISOString(),
      firstOpenedAt: e.firstOpenedAt?.toISOString() || null
    }));

    return Response.json({
      success: true,
      campaign: {
        bulkJobId,
        subject: emails[0].subject,
        sentAt: startCampaign.toISOString(),
        templateName: emails[0].templateName || "Custom Template",
        totalSent,
        totalSuccessful,
        totalFailed,
        totalOpened,
        totalClicked,
        deliveryRate: totalSent > 0 ? (totalSuccessful / totalSent) * 100 : 0,
        openRate: totalSuccessful > 0 ? (totalOpened / totalSuccessful) * 100 : 0,
        clickRate: totalSuccessful > 0 ? (totalClicked / totalSuccessful) * 100 : 0
      },
      timeSeries,
      clickBreakdown,
      analytics: {
        deviceStats,
        browserStats,
        osStats
      },
      recipients
    });
  } catch (error: any) {
    return jsonError(error.message || "Unauthorized", 401);
  }
}
