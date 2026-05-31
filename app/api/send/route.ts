import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { sendEmailWithFallback } from "@/lib/mailer";
import { parseList, jsonError } from "@/lib/utils";
import { injectTracking } from "@/lib/tracking";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/json-fields";
import { createQrForBody, objectToStrings } from "@/lib/qr-api";
import { detectQrPlaceholders, getQrImageUrl, replaceMergeFields } from "@/lib/qr";
import { normalizeUploadedAttachmentRecords } from "@/lib/security";

const schema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
  bcc: z.union([z.string(), z.array(z.string())]).optional(),
  replyTo: z.string().optional(),
  subject: z.string().min(1),
  bodyHtml: z.string().default(""),
  trackingEnabled: z.boolean().default(true),
  attachments: z.array(z.object({ name: z.string(), size: z.number().optional(), mimeType: z.string().optional(), path: z.string().optional() })).optional(),
  qrConfig: z.record(z.string(), z.object({
    campaignId: z.string().optional(),
    contentType: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    url: z.string().optional(),
    text: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    alt: z.string().optional(),
    fields: z.record(z.string(), z.string()).optional(),
    staticFields: z.record(z.string(), z.string()).optional(),
    urlTemplate: z.string().optional(),
    textTemplate: z.string().optional()
  })).optional()
});

export async function POST(req: NextRequest) {
  let user: any;
  let payload: any;
  try {
    ({ user } = await requireUser(req));
    const body = schema.parse(await req.json());
    const attachments = await normalizeUploadedAttachmentRecords(String(user._id), body.attachments || []);
    payload = {
      to: parseList(body.to),
      cc: parseList(body.cc),
      bcc: parseList(body.bcc),
      replyTo: body.replyTo,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      trackingEnabled: body.trackingEnabled,
      attachments
    };
    const qrPlaceholders = detectQrPlaceholders(payload.bodyHtml);
    if (qrPlaceholders.length) {
      payload.bodyHtml = await renderSingleQrHtml(payload.bodyHtml, body.qrConfig || {}, String(user._id), payload.to, payload.cc, payload.bcc);
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (user.dailyLimit && user.dailyLimit > 0) {
      const sentToday = await prisma.email.count({ where: { userId: String(user._id), status: "sent", sentAt: { gte: today } } });
      if (sentToday >= user.dailyLimit) return jsonError(`Daily sending limit reached (${user.dailyLimit})`, 429, "DAILY_LIMIT_REACHED");
    }
    const email = await prisma.email.create({
      data: {
        userId: String(user._id),
        toAddresses: toJson(payload.to)!,
        ccAddresses: toJson(payload.cc),
        bccAddresses: toJson(payload.bcc),
        replyTo: payload.replyTo ?? null,
        subject: payload.subject,
        bodyHtml: payload.bodyHtml,
        attachments: toJson(payload.attachments),
        status: "sending",
        sentAt: new Date(),
        trackingEnabled: payload.trackingEnabled
      }
    });
    
    const result = await sendEmailWithFallback({
      userId: String(user._id),
      to: payload.to,
      subject: payload.subject,
      html: injectTracking(payload.bodyHtml, email.id, payload.trackingEnabled),
      attachments: payload.attachments,
      replyTo: payload.replyTo,
      cc: payload.cc,
      bcc: payload.bcc,
      emailId: email.id
    });

    if (result.success) {
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "sent", usedFallbackSmtp: result.usedFallback }
      });
      await logAudit("email.sent", String(user._id), { to: payload.to, subject: payload.subject, usedFallback: result.usedFallback }, email.id, req);
      return Response.json({ success: true, messageId: result.messageId, emailId: email.id });
    } else {
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "failed", errorMsg: result.error, usedFallbackSmtp: result.usedFallback }
      });
      await logAudit("email.failed", String(user._id), { to: payload.to, subject: payload.subject, error: result.error, usedFallback: result.usedFallback }, email.id, req);
      return jsonError(`Send failed: ${result.error}`, 400, "SEND_FAILED");
    }
  } catch (error: any) {
    return jsonError(error.message || "Send failed", 400, "SEND_FAILED");
  }
}

async function renderSingleQrHtml(
  html: string,
  qrConfig: Record<string, any>,
  userId: string,
  to: string[],
  cc: string[],
  bcc: string[]
) {
  let rendered = html;
  const recipients = [to[0], cc[0], bcc[0]].filter(Boolean) as string[];
  for (const placeholder of detectQrPlaceholders(html)) {
    const config = qrConfig[placeholder];
    if (!config?.campaignId) {
      throw new Error(`QR placeholder {{${placeholder}}} needs a campaign selected before sending.`);
    }
    const mergeData = {
      name: config.name || "",
      email: config.email || recipients[0] || "",
      ...config.fields,
      ...config.staticFields
    };
    const result = await createQrForBody(userId, {
      campaignId: config.campaignId,
      contentType: config.contentType,
      fields: fieldsFromQrConfig(config, mergeData),
      url: config.urlTemplate ? replaceMergeFields(config.urlTemplate, objectToStrings(mergeData)) : config.url,
      text: config.textTemplate ? replaceMergeFields(config.textTemplate, objectToStrings(mergeData)) : config.text,
      recipientEmail: config.email || recipients[0],
      recipientName: config.name,
      mergeData
    });
    if (result.error || !result.qrCode) {
      throw new Error("Unable to generate QR code for this email.");
    }
    const src = result.qrCode.imageUrl || getQrImageUrl(result.qrCode.id);
    const width = Number(config.width) || 200;
    const height = Number(config.height) || width;
    const alt = String(config.alt || "QR Code");
    rendered = rendered.replaceAll(`{{${placeholder}}}`, `<img src="${src}" width="${width}" height="${height}" alt="${alt}" />`);
  }
  return rendered;
}

function fieldsFromQrConfig(config: any, mergeData: Record<string, string>) {
  const output: Record<string, string> = {};
  for (const [field, mapping] of Object.entries(config.fields || {}) as Array<[string, string]>) {
    output[field.toUpperCase()] = mergeData[mapping] || "";
  }
  for (const [field, value] of Object.entries(config.staticFields || {}) as Array<[string, string]>) {
    output[field.toUpperCase()] = value || "";
  }
  if (config.name) output.NAME = config.name;
  if (config.email) output.EMAIL = config.email;
  return output;
}
