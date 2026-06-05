import nodemailer from "nodemailer";
import { z } from "zod";
import type { SmtpPool } from "@prisma/client";
import { decryptText, encryptText } from "@/lib/encrypt";
import { prisma } from "@/lib/prisma";

export const smtpPoolBaseSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(50, "Label must be 50 characters or less"),
  host: z.string().trim().min(1, "Host is required"),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  fromName: z.string().trim().min(1, "From name is required"),
  fromEmail: z.string().trim().email("From email must be valid"),
  encryption: z.enum(["TLS", "SSL", "NONE"]),
  rejectUnauth: z.boolean().default(true),
  isPrimary: z.boolean().optional().default(false),
  isFallback: z.boolean().optional().default(false)
});

export const smtpPoolCreateSchema = smtpPoolBaseSchema.refine((data) => !(data.isPrimary && data.isFallback), {
  message: "An SMTP entry cannot be both primary and fallback",
  path: ["isFallback"]
});

export const smtpPoolUpdateSchema = smtpPoolBaseSchema.partial().extend({
  password: z.string().optional()
}).refine((data) => !(data.isPrimary && data.isFallback), {
  message: "An SMTP entry cannot be both primary and fallback",
  path: ["isFallback"]
});

export type SmtpPoolCreateInput = z.infer<typeof smtpPoolCreateSchema>;
export type SmtpPoolUpdateInput = z.infer<typeof smtpPoolUpdateSchema>;

export function smtpPoolRecord(entry: SmtpPool) {
  return {
    id: entry.id,
    label: entry.label,
    host: entry.host,
    port: entry.port,
    username: entry.username,
    fromName: entry.fromName,
    fromEmail: entry.fromEmail,
    encryption: entry.encryption,
    rejectUnauth: entry.rejectUnauth,
    isPrimary: entry.isPrimary,
    isFallback: entry.isFallback,
    isAdminAssigned: entry.isAdminAssigned,
    lastTestedAt: entry.lastTestedAt,
    lastTestSuccess: entry.lastTestSuccess,
    lastTestLatency: entry.lastTestLatency,
    isActive: entry.isActive,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    passwordSet: Boolean(entry.passwordEnc)
  };
}

export async function applyPoolRoleUniqueness(
  userId: string,
  isAdminAssigned: boolean,
  roles: { isPrimary?: boolean; isFallback?: boolean },
  excludeId?: string
) {
  const where = {
    userId,
    isAdminAssigned,
    ...(excludeId ? { id: { not: excludeId } } : {})
  };

  if (roles.isPrimary) {
    await prisma.smtpPool.updateMany({ where, data: { isPrimary: false } });
  }

  if (roles.isFallback) {
    await prisma.smtpPool.updateMany({ where, data: { isFallback: false } });
  }
}

export function buildPoolCreateData(userId: string, body: SmtpPoolCreateInput, isAdminAssigned: boolean) {
  return {
    userId,
    label: body.label,
    host: body.host,
    port: body.port,
    username: body.username,
    passwordEnc: encryptText(body.password),
    fromName: body.fromName,
    fromEmail: body.fromEmail,
    encryption: body.encryption,
    rejectUnauth: body.rejectUnauth,
    isPrimary: body.isPrimary,
    isFallback: body.isFallback,
    isAdminAssigned
  };
}

export function buildPoolUpdateData(body: SmtpPoolUpdateInput) {
  return {
    ...(body.label !== undefined ? { label: body.label } : {}),
    ...(body.host !== undefined ? { host: body.host } : {}),
    ...(body.port !== undefined ? { port: body.port } : {}),
    ...(body.username !== undefined ? { username: body.username } : {}),
    ...(body.password ? { passwordEnc: encryptText(body.password) } : {}),
    ...(body.fromName !== undefined ? { fromName: body.fromName } : {}),
    ...(body.fromEmail !== undefined ? { fromEmail: body.fromEmail } : {}),
    ...(body.encryption !== undefined ? { encryption: body.encryption } : {}),
    ...(body.rejectUnauth !== undefined ? { rejectUnauth: body.rejectUnauth } : {}),
    ...(body.isPrimary !== undefined ? { isPrimary: body.isPrimary } : {}),
    ...(body.isFallback !== undefined ? { isFallback: body.isFallback } : {})
  };
}

export async function testSmtpPoolEntry(entry: SmtpPool) {
  const started = Date.now();
  const transporter = nodemailer.createTransport({
    host: entry.host,
    port: entry.port,
    secure: entry.encryption === "SSL" || entry.port === 465,
    requireTLS: entry.encryption === "TLS",
    auth: {
      user: entry.username,
      pass: decryptText(entry.passwordEnc)
    },
    tls: {
      rejectUnauthorized: entry.rejectUnauth !== false
    }
  });

  await transporter.verify();
  return Date.now() - started;
}
