import { Email } from "@/models/Email";

export function trackingBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function injectTracking(bodyHtml: string, emailId: string, enabled = true) {
  if (!enabled) return bodyHtml;
  const base = trackingBaseUrl();
  const linked = bodyHtml.replace(/<a\b([^>]*?)href=(["'])(.*?)\2([^>]*)>/gis, (_match, before, quote, href, after) => {
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
    await Email.updateOne(
      { _id: emailId },
      { $inc: { openCount: 1 }, $set: { lastOpenedAt: now }, $setOnInsert: {}, $min: { firstOpenedAt: now } } as any
    );
    await Email.updateOne({ _id: emailId, firstOpenedAt: { $exists: false } }, { $set: { firstOpenedAt: now } });
  } else {
    await Email.updateOne({ _id: emailId }, { $inc: { clickCount: 1 } });
  }
}
