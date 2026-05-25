import QRCode from "qrcode";
import sharp from "sharp";
import type { PrismaClient, QrCampaign, QrCode } from "@prisma/client";
import { toJson } from "@/lib/json-fields";
export { detectQrPlaceholders, isQrPlaceholder } from "@/lib/qr-placeholders";

export type QrFields = Record<string, string | number | null | undefined>;

export type DecodedQrData =
  | { isSystemQr: true; id: string; fields: Record<string, string> }
  | { isSystemQr: false; raw: string };

const QR_PREFIX = "QR_V1";
export const PENDING_QR_ID = "__pending_qr_id__";

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

  if (campaign.logoUrl?.startsWith("https://")) {
    try {
      const logoResponse = await fetch(campaign.logoUrl);
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
      imageUrl: `/api/qr/img/${record.id}`
    }
  });
}

export function replaceMergeFields(template: string, data: Record<string, string>) {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => data[key] ?? "");
}
