import { prisma } from "@/lib/prisma";

export function trackingBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function injectTracking(bodyHtml: string, emailId: string, enabled = true) {
  if (!enabled) return bodyHtml;
  const base = trackingBaseUrl();

  // 1. Intercept custom tags: {{TRACKED_URL:label:url}}
  const processed = bodyHtml.replace(/\{\{TRACKED_URL:([^:]+?):(.*?)\}\}/gi, (_match, label, url) => {
    const trimmedUrl = url.trim();
    const trimmedLabel = label.trim();
    return `${base}/api/track/click/${emailId}?url=${encodeURIComponent(trimmedUrl)}&label=${encodeURIComponent(trimmedLabel)}`;
  });

  // 2. Intercept normal <a> links, ignoring those already tracked
  const linked = processed.replace(/<a\b([^>]*?)href=(["'])(.*?)\2([^>]*)>/gis, (_match, before, quote, href, after) => {
    if (href.includes(`/api/track/click/${emailId}`)) {
      return `<a${before}href=${quote}${href}${quote}${after}>`;
    }
    if (!/^https?:\/\//i.test(href)) return `<a${before}href=${quote}${href}${quote}${after}>`;
    const tracked = `${base}/api/track/click/${emailId}?url=${encodeURIComponent(href)}`;
    return `<a${before}href=${quote}${tracked}${quote}${after}>`;
  });

  const pixel = `<img src="${base}/api/track/open/${emailId}" width="1" height="1" style="display:none" alt="" />`;
  return /<\/body>/i.test(linked) ? linked.replace(/<\/body>/i, `${pixel}</body>`) : `${linked}${pixel}`;
}

export async function updateEmailTracking(emailId: string, type: "open" | "click") {
  const now = new Date();
  if (type === "open") {
    const email = await prisma.email.findUnique({ where: { id: emailId }, select: { firstOpenedAt: true } });
    await prisma.email.update({
      where: { id: emailId },
      data: {
        openCount: { increment: 1 },
        lastOpenedAt: now,
        firstOpenedAt: email?.firstOpenedAt ?? now
      }
    });
  } else {
    await prisma.email.update({ where: { id: emailId }, data: { clickCount: { increment: 1 } } });
  }
}

