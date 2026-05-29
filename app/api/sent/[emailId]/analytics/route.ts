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

export async function GET(req: NextRequest, { params }: { params: Promise<{ emailId: string }> }) {
  try {
    const { user } = await requireUser(req);
    const { emailId } = await params;

    const email = await prisma.email.findUnique({
      where: { id: emailId }
    });

    if (!email) {
      return jsonError("Email not found", 404);
    }

    if (email.userId !== String(user._id) && user.role !== "admin") {
      return jsonError("Forbidden", 403);
    }

    // Fetch tracking events
    const [events, clickEvents] = await Promise.all([
      prisma.emailEvent.findMany({
        where: { emailId },
        orderBy: { timestamp: "asc" }
      }),
      prisma.clickEvent.findMany({
        where: { emailId },
        orderBy: { timestamp: "asc" }
      })
    ]);

    // Aggregate UA stats for opens & clicks
    const deviceStats: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const browserStats: Record<string, number> = {};
    const osStats: Record<string, number> = {};

    // Group Click Breakdown
    const linkStats: Record<string, { label: string; url: string; clicks: number; uniqueIps: Set<string> }> = {};

    for (const ev of events) {
      const { device, browser, os } = parseUserAgent(ev.userAgent || "");
      deviceStats[device] = (deviceStats[device] || 0) + 1;
      browserStats[browser] = (browserStats[browser] || 0) + 1;
      osStats[os] = (osStats[os] || 0) + 1;
    }

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

    return Response.json({
      success: true,
      email: {
        id: email.id,
        toAddresses: JSON.parse(email.toAddresses),
        ccAddresses: email.ccAddresses ? JSON.parse(email.ccAddresses) : [],
        bccAddresses: email.bccAddresses ? JSON.parse(email.bccAddresses) : [],
        subject: email.subject,
        bodyHtml: email.bodyHtml,
        sentAt: email.sentAt.toISOString(),
        status: email.status,
        openCount: email.openCount,
        clickCount: email.clickCount,
        firstOpenedAt: email.firstOpenedAt?.toISOString() || null,
        lastOpenedAt: email.lastOpenedAt?.toISOString() || null,
      },
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        timestamp: e.timestamp.toISOString(),
        ip: e.ip,
        url: e.url,
        uaParsed: parseUserAgent(e.userAgent || "")
      })),
      clickBreakdown,
      analytics: {
        deviceStats,
        browserStats,
        osStats
      }
    });
  } catch (error: any) {
    return jsonError(error.message || "Unauthorized", 401);
  }
}
