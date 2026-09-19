import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin(req);

  const url = new URL(req.url);
  const days = Math.min(Number(url.searchParams.get("days") || 30), 90);

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get all sent/failed emails in the time window with recipients
  const emails = await prisma.email.findMany({
    where: {
      sentAt: { gte: since },
      status: { in: ["sent", "failed"] },
    },
    select: {
      id: true,
      toAddresses: true,
      status: true,
      sentAt: true,
      isBulk: true,
    },
  });

  // Aggregate by domain
  const domainMap = new Map<
    string,
    { sent: number; failed: number; bulk: number; lastSentAt: Date | null }
  >();

  for (const email of emails) {
    let toList: string[] = [];
    try {
      toList = JSON.parse(email.toAddresses) as string[];
    } catch {
      toList = [email.toAddresses];
    }

    for (const addr of toList) {
      const parts = addr.split("@");
      const domain = parts.length === 2 ? parts[1].toLowerCase().trim() : "unknown";

      if (!domainMap.has(domain)) {
        domainMap.set(domain, { sent: 0, failed: 0, bulk: 0, lastSentAt: null });
      }
      const entry = domainMap.get(domain)!;
      if (email.status === "sent") entry.sent++;
      if (email.status === "failed") entry.failed++;
      if (email.isBulk) entry.bulk++;
      if (!entry.lastSentAt || email.sentAt > entry.lastSentAt) {
        entry.lastSentAt = email.sentAt;
      }
    }
  }

  // Convert to sorted array
  const domains = Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      sent: stats.sent,
      failed: stats.failed,
      bulk: stats.bulk,
      total: stats.sent + stats.failed,
      deliveryRate:
        stats.sent + stats.failed > 0
          ? Math.round((stats.sent / (stats.sent + stats.failed)) * 100)
          : 0,
      lastSentAt: stats.lastSentAt,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 50); // Top 50 domains

  // Daily trend data for top 10 domains
  const top10 = domains.slice(0, 10).map((d) => d.domain);

  // Build daily buckets for trend chart
  const trendDays = Math.min(days, 14);
  const buckets: Array<{ date: string; [domain: string]: number | string }> =
    [];
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.push({ date: d.toISOString().split("T")[0] });
  }

  for (const email of emails) {
    let toList: string[] = [];
    try {
      toList = JSON.parse(email.toAddresses) as string[];
    } catch {
      toList = [email.toAddresses];
    }
    const dateStr = email.sentAt.toISOString().split("T")[0];
    const bucket = buckets.find((b) => b.date === dateStr);
    if (!bucket) continue;

    for (const addr of toList) {
      const parts = addr.split("@");
      const domain = parts.length === 2 ? parts[1].toLowerCase().trim() : "unknown";
      if (!top10.includes(domain)) continue;
      if (email.status === "sent") {
        bucket[domain] = ((bucket[domain] as number) || 0) + 1;
      }
    }
  }

  // Global summary
  const totalSent = domains.reduce((s, d) => s + d.sent, 0);
  const totalFailed = domains.reduce((s, d) => s + d.failed, 0);
  const overallDeliveryRate =
    totalSent + totalFailed > 0
      ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
      : 0;

  return Response.json({
    success: true,
    summary: {
      totalSent,
      totalFailed,
      overallDeliveryRate,
      uniqueDomains: domainMap.size,
      days,
    },
    domains,
    trend: buckets,
    top10Domains: top10,
  });
}
