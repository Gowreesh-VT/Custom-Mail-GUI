import QRCode from "qrcode";
import sharp from "sharp";
import type { PrismaClient, QrCampaign, QrCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/json-fields";
export { detectQrPlaceholders, isQrPlaceholder } from "@/lib/qr-placeholders";

export type QrFields = Record<string, string | number | null | undefined>;

export type QrFieldConfig = {
  placeholderName: string;
  campaignId?: string;
  campaignType?: string;
  contentType?: string;
  fieldMappings?: Record<string, { source: "csv" | "static"; column?: string; value?: string }>;
  fields?: Record<string, string>;
  staticFields?: Record<string, string>;
  urlTemplate?: string;
  textTemplate?: string;
  url?: string;
  text?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type RecipientRow = {
  email: string;
  data: Record<string, string>;
};

export type DecodedQrData =
  | { isSystemQr: true; id: string; fields: Record<string, string> }
  | { isSystemQr: false; raw: string };

const QR_PREFIX = "QR_V1";
export const PENDING_QR_ID = "__pending_qr_id__";

if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error(
    "NEXT_PUBLIC_APP_URL is not set. " +
      "QR image URLs will be broken in emails. " +
      "Add NEXT_PUBLIC_APP_URL=https://yourdomain.com to your .env file."
  );
}

export function getPublicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");
}

export function getQrImageUrl(id: string) {
  return `${getPublicAppUrl()}/api/qr/img/${id}`;
}

function sanitizePart(value: unknown) {
  return String(value ?? "").replace(/[|\r\n]+/g, " ").trim();
}

function encodeFields(fields: QrFields = {}) {
  return Object.entries(fields)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([key, value]) => `${sanitizePart(key).toUpperCase()}:${sanitizePart(value)}`);
}

export function encodeCheckinData(qrId: string, fields: QrFields) {
  return [QR_PREFIX, `ID:${sanitizePart(qrId)}`, ...encodeFields(fields)].join("|");
}

export function encodeUrlData(qrId: string, url: string, extraFields: QrFields = {}) {
  return [QR_PREFIX, `ID:${sanitizePart(qrId)}`, `URL:${sanitizePart(url)}`, ...encodeFields(extraFields)].join("|");
}

export function encodeTextData(qrId: string, text: string, extraFields: QrFields = {}) {
  return [QR_PREFIX, `ID:${sanitizePart(qrId)}`, `TEXT:${sanitizePart(text)}`, ...encodeFields(extraFields)].join("|");
}

export function decodeQrData(rawString: string): DecodedQrData {
  if (!rawString.startsWith(QR_PREFIX)) return { isSystemQr: false, raw: rawString };
  const fields: Record<string, string> = {};
  for (const part of rawString.split("|").slice(1)) {
    const separator = part.indexOf(":");
    if (separator === -1) continue;
    fields[part.slice(0, separator)] = part.slice(separator + 1);
  }
  return { isSystemQr: true, id: fields.ID || "", fields };
}

export async function generateQrBuffer(encodedData: string, campaign: Pick<QrCampaign, "brandColor" | "bgColor">) {
  return QRCode.toBuffer(encodedData, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: "H",
    color: {
      dark: campaign.brandColor || "#000000",
      light: campaign.bgColor || "#ffffff"
    }
  });
}

export async function applyQrStyling(
  buffer: Buffer,
  campaign: Pick<QrCampaign, "logoUrl" | "borderSize" | "borderColor" | "cornerRadius">
) {
  let image = sharp(buffer).png();
  const metadata = await image.metadata();
  const width = metadata.width || 400;
  const composites: sharp.OverlayOptions[] = [];

  const logoUrl = campaign.logoUrl;
  if (logoUrl && isSafeRemoteLogoUrl(logoUrl)) {
    try {
      const logoResponse = await fetch(logoUrl);
      if (logoResponse.ok) {
        const logoSize = Math.round(width * 0.2);
        const padding = Math.round(logoSize * 0.14);
        const logo = await sharp(Buffer.from(await logoResponse.arrayBuffer()))
          .resize(logoSize, logoSize, { fit: "inside" })
          .extend({ top: padding, bottom: padding, left: padding, right: padding, background: "#ffffff" })
          .png()
          .toBuffer();
        const logoMeta = await sharp(logo).metadata();
        composites.push({
          input: logo,
          left: Math.round((width - (logoMeta.width || logoSize)) / 2),
          top: Math.round((width - (logoMeta.height || logoSize)) / 2)
        });
      }
    } catch {
      // Remote logo failures should not prevent QR rendering.
    }
  }

  if (composites.length) image = image.composite(composites);

  let output = await image.toBuffer();
  if (campaign.borderSize > 0) {
    output = await sharp(output)
      .extend({
        top: campaign.borderSize,
        bottom: campaign.borderSize,
        left: campaign.borderSize,
        right: campaign.borderSize,
        background: campaign.borderColor || "#000000"
      })
      .png()
      .toBuffer();
  }

  if (campaign.cornerRadius > 0) {
    const roundedMeta = await sharp(output).metadata();
    const w = roundedMeta.width || width;
    const h = roundedMeta.height || width;
    const radius = Math.min(campaign.cornerRadius, Math.floor(Math.min(w, h) / 2));
    const mask = Buffer.from(
      `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
    );
    output = await sharp(output).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  }

  return output;
}

export function isSafeRemoteLogoUrl(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) return false;
    if (/^(10|127)\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

async function placeholder(text: string, color: string) {
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="#eeeeee"/>
    <path d="M56 56h92v92H56zM252 56h92v92h-92zM56 252h92v92H56z" fill="#d7d7d7"/>
    <text x="200" y="215" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="${color}">${text}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function generateExpiredQrBuffer() {
  return placeholder("EXPIRED", "#dc2626");
}

export function generateInvalidQrBuffer() {
  return placeholder("INVALID", "#dc2626");
}

export async function createQrRecord(
  prisma: PrismaClient,
  data: {
    campaignId: string;
    userId: string;
    contentType: string;
    encodedData: string;
    recipientEmail?: string | null;
    recipientName?: string | null;
    mergeData?: Record<string, unknown> | null;
    emailId?: string | null;
  }
): Promise<QrCode> {
  const record = await prisma.qrCode.create({
    data: {
      campaignId: data.campaignId,
      userId: data.userId,
      contentType: data.contentType,
      encodedData: data.encodedData,
      imageUrl: "",
      recipientEmail: data.recipientEmail ?? null,
      recipientName: data.recipientName ?? null,
      mergeData: data.mergeData ? toJson(data.mergeData) : null,
      emailId: data.emailId ?? null
    }
  });
  return prisma.qrCode.update({
    where: { id: record.id },
    data: {
      encodedData: record.encodedData.replace(PENDING_QR_ID, record.id),
      imageUrl: getQrImageUrl(record.id)
    }
  });
}

export function replaceMergeFields(template: string, data: Record<string, string>) {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => data[key] ?? "");
}

const fallbackQrHtml =
  "<div style=\"width:200px;height:200px;background:#f5f5f5;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;text-align:center;padding:8px;\">QR unavailable</div>";

export async function replaceQrPlaceholders(
  html: string,
  qrFieldConfigs: QrFieldConfig[],
  recipient: RecipientRow,
  userId: string,
  options?: {
    onError?: (error: Error, config: QrFieldConfig) => void;
    onGenerated?: (imageUrl: string, config: QrFieldConfig) => void;
  }
) {
  let rendered = html;
  for (const config of qrFieldConfigs) {
    try {
      const campaignId = String(config.campaignId || "");
      if (!campaignId) throw new Error("Missing campaign id");
      const contentType = await resolveContentType(campaignId, config);
      const fields = buildFieldMap(config, recipient.data);
      const encodedData = buildEncodedPayload(contentType, config, recipient.data, fields);
      let qrCode = recipient.email
        ? await prisma.qrCode.findFirst({
            where: {
              campaignId,
              userId,
              recipientEmail: recipient.email,
              status: "active"
            }
          })
        : null;

      if (!qrCode) {
        qrCode = await createQrRecord(prisma, {
          campaignId,
          userId,
          contentType,
          encodedData,
          recipientEmail: recipient.email,
          recipientName: recipient.data.name || recipient.data.NAME || null,
          mergeData: recipient.data
        });
      }
      const imageUrl = qrCode.imageUrl || getQrImageUrl(qrCode.id);
      options?.onGenerated?.(imageUrl, config);
      const width = Number(config.width) || 200;
      const height = Number(config.height) || width;
      const alt = String(config.alt || "QR Code");
      rendered = replaceQrPlaceholderHtml(
        rendered,
        config.placeholderName,
        `<img src=\"${imageUrl}\" width=\"${width}\" height=\"${height}\" alt=\"${alt}\" style=\"display:block;\" />`
      );
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error || "QR generation failed"));
      options?.onError?.(err, config);
      rendered = replaceQrPlaceholderHtml(rendered, config.placeholderName, fallbackQrHtml);
    }
  }
  return rendered;
}

function replaceQrPlaceholderHtml(html: string, placeholderName: string, replacement: string) {
  if (!placeholderName) return html;
  const escaped = placeholderName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const imgPattern = new RegExp(`<img[^>]*src=["']\\{\\{\\s*${escaped}\\s*\\}\\}["'][^>]*>`, "gi");
  if (imgPattern.test(html)) {
    return html.replace(imgPattern, replacement);
  }
  const tokenPattern = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "g");
  return html.replace(tokenPattern, replacement);
}

async function resolveContentType(campaignId: string, config: QrFieldConfig) {
  const hint = config.contentType || config.campaignType;
  if (hint) return hint;
  const campaign = await prisma.qrCampaign.findUnique({ where: { id: campaignId }, select: { type: true } });
  if (!campaign?.type) throw new Error("Campaign not found");
  return campaign.type;
}

function buildFieldMap(config: QrFieldConfig, data: Record<string, string>) {
  const output: Record<string, string> = {};
  if (config.fieldMappings) {
    for (const [key, mapping] of Object.entries(config.fieldMappings)) {
      output[key.toUpperCase()] = mapping.source === "static" ? String(mapping.value || "") : String(data[mapping.column || ""] || "");
    }
  }
  if (config.fields) {
    for (const [field, mapping] of Object.entries(config.fields)) {
      output[field.toUpperCase()] = String(data[mapping] || "");
    }
  }
  if (config.staticFields) {
    for (const [field, value] of Object.entries(config.staticFields)) {
      output[field.toUpperCase()] = String(value || "");
    }
  }
  if (!output.NAME && (data.name || data.NAME)) output.NAME = String(data.name || data.NAME || "");
  if (!output.EMAIL && data.email) output.EMAIL = String(data.email || "");
  return output;
}

function buildEncodedPayload(contentType: string, config: QrFieldConfig, data: Record<string, string>, fields: QrFields) {
  if (contentType === "checkin") return encodeCheckinData(PENDING_QR_ID, fields);
  if (contentType === "url") {
    const template = config.urlTemplate || config.url || data.url || "";
    const resolved = replaceMergeFields(String(template), data);
    return encodeUrlData(PENDING_QR_ID, resolved, fields);
  }
  const template = config.textTemplate || config.text || data.text || "";
  const resolved = replaceMergeFields(String(template), data);
  return encodeTextData(PENDING_QR_ID, resolved, fields);
}
