import { prisma } from "@/lib/prisma";
import { expandRsvpTags } from "@/lib/rsvp";

export function trackingBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

const TRACKED_URL_TAG = /\{\{TRACKED_URL:([^:]+?):(.*?)\}\}/gi;

// hrefs are read straight out of HTML, so "&" arrives as "&amp;".
function decodeHref(href: string) {
  return href.replace(/&amp;/gi, "&").trim();
}

// Replaces {{TRACKED_URL:label:url}} with the plain url (tracking off, or no Email row to track against).
export function stripTrackedUrlTags(bodyHtml: string) {
  return bodyHtml.replace(TRACKED_URL_TAG, (_match, _label, url) => url.trim());
}

// The click redirect only follows urls that were actually in the email, so it can't be used as an open redirect.
export function linkAppearsInEmail(bodyHtml: string, url: string) {
  return bodyHtml.includes(url) || bodyHtml.includes(url.replace(/&/g, "&amp;"));
}

export function injectTracking(bodyHtml: string, emailId: string, enabled = true) {
  const base = trackingBaseUrl();
  const withRsvp = expandRsvpTags(bodyHtml, emailId, base);
  if (!enabled) return stripTrackedUrlTags(withRsvp);

  // 1. Intercept custom tags: {{TRACKED_URL:label:url}}
  const processed = withRsvp.replace(TRACKED_URL_TAG, (_match, label, url) => {
    const trimmedUrl = decodeHref(url);
    const trimmedLabel = label.trim();
    return `${base}/api/track/click/${emailId}?url=${encodeURIComponent(trimmedUrl)}&label=${encodeURIComponent(trimmedLabel)}`;
  });

  // 2. Intercept normal <a> links, ignoring those already tracked and RSVP links (recorded on the RSVP page)
  const linked = processed.replace(/<a\b([^>]*?)href=(["'])(.*?)\2([^>]*)>/gis, (_match, before, quote, href, after) => {
    if (href.includes(`/api/track/click/${emailId}`) || href.startsWith(`${base}/rsvp/`)) {
      return `<a${before}href=${quote}${href}${quote}${after}>`;
    }
    if (!/^https?:\/\//i.test(href)) return `<a${before}href=${quote}${href}${quote}${after}>`;
    const tracked = `${base}/api/track/click/${emailId}?url=${encodeURIComponent(decodeHref(href))}`;
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

