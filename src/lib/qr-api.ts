import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromJson, toJson } from "@/lib/json-fields";
import { jsonError } from "@/lib/utils";
import { createQrRecord, encodeCheckinData, encodeTextData, encodeUrlData, isSafeRemoteLogoUrl, PENDING_QR_ID, replaceMergeFields, type QrFields } from "@/lib/qr";

export const QR_TYPES = ["checkin", "url", "text"] as const;
export const QR_SCAN_MODES = ["once", "unlimited"] as const;
export const QR_STATUSES = ["active", "used", "expired", "invalidated"] as const;

export function jsonSuccess<T extends Record<string, unknown>>(data: T) {
  return Response.json({ success: true, ...data });
}

export function parseDisplayFields(value: string | null | undefined) {
  return fromJson<string[]>(value, []);
}

export function qrCampaignPayload(campaign: any) {
  return {
    ...campaign,
    displayFields: parseDisplayFields(campaign.displayFields)
  };
}

export function qrCodePayload(code: any, includeEncodedData = true) {
  const { encodedData, ...rest } = code;
  return {
    ...(includeEncodedData ? { encodedData } : {}),
    ...rest,
    mergeData: fromJson<Record<string, unknown>>(code.mergeData, {})
  };
}

export async function getOwnedCampaign(id: string, userId: string) {
  return prisma.qrCampaign.findFirst({ where: { id, userId } });
}

export function validateCampaignInput(body: any, partial = false) {
  const errors: string[] = [];
  if (!partial && !body.name) errors.push("Campaign name is required");
  if (body.type && !QR_TYPES.includes(body.type)) errors.push("Invalid QR type");
  if (body.scanMode && !QR_SCAN_MODES.includes(body.scanMode)) errors.push("Invalid scan mode");
  if (body.logoUrl && !isSafeRemoteLogoUrl(String(body.logoUrl))) errors.push("Logo URL must be a safe public https URL");
  if (errors.length) return errors[0];
  return null;
}

export function campaignDataFromBody(body: any) {
  return {
    ...(body.name !== undefined ? { name: String(body.name) } : {}),
    ...(body.description !== undefined ? { description: body.description ? String(body.description) : null } : {}),
    ...(body.type !== undefined ? { type: String(body.type) } : {}),
    ...(body.scanMode !== undefined ? { scanMode: String(body.scanMode) } : {}),
    ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } : {}),
    ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
    ...(body.brandColor !== undefined ? { brandColor: String(body.brandColor || "#000000") } : {}),
    ...(body.bgColor !== undefined ? { bgColor: String(body.bgColor || "#ffffff") } : {}),
    ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl ? String(body.logoUrl) : null } : {}),
    ...(body.cornerRadius !== undefined ? { cornerRadius: Number(body.cornerRadius) || 0 } : {}),
    ...(body.borderSize !== undefined ? { borderSize: Number(body.borderSize) || 0 } : {}),
    ...(body.borderColor !== undefined ? { borderColor: String(body.borderColor || "#000000") } : {}),
    ...(body.displayFields !== undefined ? { displayFields: toJson(Array.isArray(body.displayFields) ? body.displayFields : []) ?? "[]" } : {})
  };
}

export function buildEncodedData(contentType: string, body: any, fields: QrFields = body.fields ?? {}) {
  if (contentType === "checkin") return encodeCheckinData(PENDING_QR_ID, fields);
  if (contentType === "url") {
    const url = replaceMergeFields(String(body.url || ""), objectToStrings(body.mergeData || fields));
    return encodeUrlData(PENDING_QR_ID, url, fields);
  }
  const text = replaceMergeFields(String(body.text || ""), objectToStrings(body.mergeData || fields));
  return encodeTextData(PENDING_QR_ID, text, fields);
}

export async function createQrForBody(userId: string, body: any) {
  const campaign = await getOwnedCampaign(String(body.campaignId || ""), userId);
  if (!campaign) return { error: jsonError("Campaign not found", 404) };
  const contentType = String(body.contentType || campaign.type);
  if (!QR_TYPES.includes(contentType as any)) return { error: jsonError("Invalid QR content type", 400) };
  const encodedData = buildEncodedData(contentType, body);
  const qrCode = await createQrRecord(prisma, {
    campaignId: campaign.id,
    userId,
    contentType,
    encodedData,
    recipientEmail: body.recipientEmail,
    recipientName: body.recipientName,
    mergeData: body.mergeData ?? body.fields ?? null,
    emailId: body.emailId
  });
  return { campaign, qrCode };
}

export function requestMeta(req: NextRequest) {
  return {
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? null,
    userAgent: req.headers.get("user-agent") ?? null
  };
}

export function objectToStrings(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]));
}

