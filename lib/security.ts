import path from "path";
import { access } from "fs/promises";
import type { AttachmentRecord } from "@/types/models";

type RateLimitEntry = {
  attempts: number;
  resetAt: number;
};

const attemptStore = new Map<string, RateLimitEntry>();

export function resolveUserAttachmentPath(userId: string, attachmentPath: string) {
  const uploadsRoot = path.resolve(process.cwd(), "uploads", String(userId));
  const resolvedPath = path.resolve(attachmentPath);
  if (!resolvedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
    throw new Error("Invalid attachment path");
  }
  return resolvedPath;
}

export function getRequestIp(req: Pick<Request, "headers">) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitAttempt(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = attemptStore.get(key);
  if (!entry || entry.resetAt <= now) {
    attemptStore.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(limit - 1, 0), resetAt: now + windowMs };
  }
  if (entry.attempts >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.attempts += 1;
  attemptStore.set(key, entry);
  return { allowed: true, remaining: Math.max(limit - entry.attempts, 0), resetAt: entry.resetAt };
}

export function clearRateLimit(key: string) {
  attemptStore.delete(key);
}

export function cleanupRateLimitKeyParts(...parts: Array<string | undefined | null>) {
  return parts.filter(Boolean).join(":");
}

export async function normalizeUploadedAttachmentRecords(
  userId: string,
  attachments: Array<{ name: string; size?: number; mimeType?: string; path?: string }>
): Promise<AttachmentRecord[]> {
  const normalized: AttachmentRecord[] = [];
  for (const attachment of attachments) {
    if (!attachment.path) throw new Error("Invalid attachment path");
    const resolvedPath = resolveUserAttachmentPath(userId, attachment.path);
    await access(resolvedPath);
    normalized.push({
      name: path.basename(attachment.name || resolvedPath),
      size: Number(attachment.size) || 0,
      mimeType: attachment.mimeType || "application/octet-stream",
      path: resolvedPath
    });
  }
  return normalized;
}
