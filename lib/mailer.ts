import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type { SmtpPool } from "@prisma/client";
import { access } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { decryptText } from "@/lib/encrypt";
import { resolveUserAttachmentPath } from "@/lib/security";
import { logAudit } from "@/lib/audit";
import { toJson } from "@/lib/json-fields";

export interface SendPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  bodyHtml: string;
  attachments?: Array<{ name?: string; path?: string; content?: Buffer; contentType?: string }>;
}

export interface SendEmailOptions {
  userId: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: Array<{ name?: string; path?: string; content?: Buffer; contentType?: string }>;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

type SmtpConfig = {
  host?: string | null;
  port?: number | null;
  username?: string | null;
  passwordEnc?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  encryption?: string | null;
  rejectUnauth?: boolean | null;
};

type SmtpSource = "global" | "admin_assigned" | "pool" | "legacy";

export type UserWithSmtp = {
  id?: string;
  _id?: string;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUsername?: string | null;
  smtpPasswordEnc?: string | null;
  smtpFromName?: string | null;
  smtpFromEmail?: string | null;
  smtpEncryption?: string | null;
  smtpRejectUnauth?: boolean | null;
  smtpFallbackEnabled?: boolean;
  smtpSecondaryHost?: string | null;
  smtpSecondaryPort?: number | null;
  smtpSecondaryUser?: string | null;
  smtpSecondaryPassEnc?: string | null;
  smtpSecondaryFromName?: string | null;
  smtpSecondaryFromEmail?: string | null;
  smtpSecondaryEncryption?: string | null;
  smtpSecondaryRejectUnauth?: boolean | null;
};

function userToSmtpConfig(user: UserWithSmtp): SmtpConfig {
  return {
    host: user.smtpHost,
    port: user.smtpPort,
    username: user.smtpUsername,
    passwordEnc: user.smtpPasswordEnc,
    fromName: user.smtpFromName,
    fromEmail: user.smtpFromEmail,
    encryption: user.smtpEncryption,
    rejectUnauth: user.smtpRejectUnauth
  };
}

export function hasSmtpConfig(user: UserWithSmtp) {
  return hasConfig(userToSmtpConfig(user));
}

function hasConfig(config: SmtpConfig) {
  return Boolean(config.host && config.port && config.username && config.passwordEnc && config.fromEmail);
}

function createTransporterFromConfig(config: SmtpConfig) {
  if (!hasConfig(config)) throw new Error("SMTP config is incomplete");
  return nodemailer.createTransport({
    pool: true,
    maxConnections: 5,
    maxMessages: 500,
    host: config.host!,
    port: config.port!,
    secure: config.encryption === "SSL" || config.port === 465,
    requireTLS: config.encryption === "TLS",
    auth: {
      user: config.username!,
      pass: decryptText(config.passwordEnc!)
    },
    tls: {
      rejectUnauthorized: config.rejectUnauth !== false
    }
  });
}

function buildSmtpConfig(pool: SmtpPool): SmtpConfig {
  return {
    host: pool.host,
    port: pool.port,
    username: pool.username,
    passwordEnc: pool.passwordEnc,
    fromName: pool.fromName,
    fromEmail: pool.fromEmail,
    encryption: pool.encryption,
    rejectUnauth: pool.rejectUnauth
  };
}

function userToSecondarySmtpConfig(user: UserWithSmtp): SmtpConfig | null {
  if (!user.smtpSecondaryHost || !user.smtpSecondaryPassEnc) return null;
  return {
    host: user.smtpSecondaryHost,
    port: user.smtpSecondaryPort,
    username: user.smtpSecondaryUser,
    passwordEnc: user.smtpSecondaryPassEnc,
    fromName: user.smtpSecondaryFromName,
    fromEmail: user.smtpSecondaryFromEmail,
    encryption: user.smtpSecondaryEncryption,
    rejectUnauth: user.smtpSecondaryRejectUnauth
  };
}

export async function resolveSmtpConfig(userId: string): Promise<{
  primary: SmtpConfig;
  fallback: SmtpConfig | null;
  source: SmtpSource;
}> {
  const systemConfig = await prisma.systemConfig.findFirst();
  if (systemConfig?.globalSmtpActive) {
    const globalSmtp = {
      host: systemConfig.smtpHost,
      port: systemConfig.smtpPort,
      username: systemConfig.smtpUsername,
      passwordEnc: systemConfig.smtpPasswordEnc,
      fromName: systemConfig.smtpFromName,
      fromEmail: systemConfig.smtpFromEmail,
      encryption: systemConfig.smtpEncryption,
      rejectUnauth: systemConfig.smtpRejectUnauth
    };
    if (!hasConfig(globalSmtp)) {
      throw new Error("Global SMTP override is active but not fully configured");
    }
    return { primary: globalSmtp, fallback: null, source: "global" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { smtpPool: true }
  });
  if (!user) throw new Error("User not found");

  if (user.adminSmtpLocked) {
    const adminPool = user.smtpPool.filter((smtp) => smtp.isAdminAssigned && smtp.isActive);
    const primary = adminPool.find((smtp) => smtp.isPrimary);
    const fallback = adminPool.find((smtp) => smtp.isFallback) ?? null;
    if (!primary) {
      throw new Error("Admin locked SMTP but no primary assigned. Contact administrator.");
    }
    return {
      primary: buildSmtpConfig(primary),
      fallback: fallback ? buildSmtpConfig(fallback) : null,
      source: "admin_assigned"
    };
  }

  const userPool = user.smtpPool.filter((smtp) => !smtp.isAdminAssigned && smtp.isActive);
  if (userPool.length > 0) {
    const primary = userPool.find((smtp) => smtp.isPrimary);
    const fallback = userPool.find((smtp) => smtp.isFallback) ?? null;
    if (primary) {
      return {
        primary: buildSmtpConfig(primary),
        fallback: fallback ? buildSmtpConfig(fallback) : null,
        source: "pool"
      };
    }
  }

  const legacyPrimary = userToSmtpConfig(user);
  if (!hasConfig(legacyPrimary)) {
    throw new Error("SMTP is not configured. Go to Settings to add your SMTP credentials.");
  }
  return {
    primary: legacyPrimary,
    fallback: user.smtpFallbackEnabled ? userToSecondarySmtpConfig(user) : null,
    source: "legacy"
  };
}

export function createTransporter(user: UserWithSmtp) {
  if (!hasSmtpConfig(user)) throw new Error("SMTP config is incomplete");
  return createTransporterFromConfig(userToSmtpConfig(user));
}

async function getGlobalSmtpConfig(): Promise<SmtpConfig | null> {
  const systemConfig = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
  if (!systemConfig?.globalSmtpActive) return null;
  return {
    host: systemConfig.smtpHost,
    port: systemConfig.smtpPort,
    username: systemConfig.smtpUsername,
    passwordEnc: systemConfig.smtpPasswordEnc,
    fromName: systemConfig.smtpFromName,
    fromEmail: systemConfig.smtpFromEmail,
    encryption: systemConfig.smtpEncryption,
    rejectUnauth: systemConfig.smtpRejectUnauth
  };
}

export async function getEffectiveSmtpConfig(user: UserWithSmtp) {
  const globalSmtp = await getGlobalSmtpConfig();
  if (globalSmtp && hasConfig(globalSmtp)) return globalSmtp;
  return userToSmtpConfig(user);
}

export async function isGlobalSmtpActive() {
  const systemConfig = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
  return Boolean(systemConfig?.globalSmtpActive);
}

export async function createMailerTransporter(userId: string) {
  const globalSmtp = await getGlobalSmtpConfig();
  if (globalSmtp) {
    if (!hasConfig(globalSmtp)) {
      throw new Error("Global SMTP override is active but not fully configured");
    }
    return createTransporterFromConfig(globalSmtp);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !hasSmtpConfig(user)) {
    throw new Error("SMTP is not configured. Go to Settings to add your SMTP credentials.");
  }
  return createTransporter(user);
}

export async function sendMailForUser(user: UserWithSmtp, payload: SendPayload, existingTransporter?: any) {
  const config = await getEffectiveSmtpConfig(user);
  const transporter = existingTransporter || createTransporterFromConfig(config);
  const userId = String(user.id || user._id || "");
  const attachments = payload.attachments ? await normalizeAttachments(userId, payload.attachments) : undefined;
  const options: Mail.Options = {
    from: `"${config.fromName || config.fromEmail}" <${config.fromEmail}>`,
    to: payload.to,
    cc: payload.cc,
    bcc: payload.bcc,
    replyTo: payload.replyTo,
    subject: payload.subject,
    html: payload.bodyHtml,
    attachments: attachments?.map((attachment) => ({
      filename: attachment.name,
      path: attachment.path,
      content: attachment.content,
      contentType: attachment.contentType
    }))
  };
  return transporter.sendMail(options);
}

export async function normalizeAttachments(userId: string, attachments: SendPayload["attachments"]) {
  const normalized: NonNullable<SendPayload["attachments"]> = [];
  for (const attachment of attachments || []) {
    const filename = attachment.name ? path.basename(attachment.name) : undefined;
    if (attachment.content) {
      normalized.push({
        name: filename,
        content: attachment.content,
        contentType: attachment.contentType
      });
      continue;
    }
    if (!attachment.path) {
      console.warn(`[mailer] Skipping attachment ${filename || "unnamed"}: missing file path and content buffer`);
      continue;
    }
    try {
      const resolvedPath = resolveUserAttachmentPath(userId, attachment.path);
      await access(resolvedPath);
      normalized.push({
        name: filename,
        path: resolvedPath,
        contentType: attachment.contentType
      });
    } catch (err: any) {
      console.warn(`[mailer] Could not access attachment ${filename || "unnamed"} at ${attachment.path}: ${err.message}`);
    }
  }
  return normalized;
}

export function createSecondaryTransporter(user: UserWithSmtp) {
  if (!user.smtpSecondaryHost) {
    return null;
  }
  const pass = decryptText(user.smtpSecondaryPassEnc!);
  return nodemailer.createTransport({
    host: user.smtpSecondaryHost,
    port: user.smtpSecondaryPort || undefined,
    secure: user.smtpSecondaryEncryption === "SSL",
    auth: {
      user: user.smtpSecondaryUser || "",
      pass: pass
    },
    tls: {
      rejectUnauthorized: user.smtpSecondaryRejectUnauth !== false
    }
  });
}

export function isFallbackTriggerError(error: any): boolean {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("535") ||
    message.includes("550") ||
    message.includes("551") ||
    message.includes("552") ||
    message.includes("553") ||
    message.includes("554") ||
    message.includes("Invalid credentials") ||
    message.includes("authentication") ||
    message.includes("not found") ||
    message.includes("does not exist")
  ) {
    return false;
  }

  if (
    message.includes("421") ||
    message.includes("450") ||
    message.includes("451") ||
    message.includes("452") ||
    message.includes("rate limit") ||
    message.includes("too many") ||
    message.includes("quota exceeded") ||
    message.includes("daily limit") ||
    message.includes("sending limit") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ENOTFOUND") ||
    message.includes("connection timeout") ||
    message.includes("Connection timeout") ||
    message.includes("maxConnections")
  ) {
    return true;
  }

  return false;
}

export function extractSmtpCode(errorMsg: string): string | null {
  const match = errorMsg.match(/\b([45]\d{2})\b/);
  return match ? match[1] : null;
}

export async function sendEmailWithFallback({
  userId,
  to,
  subject,
  html,
  attachments,
  replyTo,
  cc,
  bcc,
  emailId,
}: SendEmailOptions & { emailId?: string }): Promise<{
  success: boolean;
  usedFallback: boolean;
  error?: string;
  messageId?: string;
  bothFailed?: boolean;
  primaryError?: string;
  fallbackError?: string;
}> {
  let resolved: Awaited<ReturnType<typeof resolveSmtpConfig>>;
  try {
    resolved = await resolveSmtpConfig(userId);
  } catch (error) {
    return {
      success: false,
      usedFallback: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  const { primary: primaryConfig, fallback: fallbackConfig, source } = resolved;

  const recipientEmailStr = to.join(", ");

  // Step 3: Attempt primary SMTP
  try {
    const transporter = createTransporterFromConfig(primaryConfig);
    const normalized = attachments ? await normalizeAttachments(userId, attachments) : undefined;
    
    const result = await transporter.sendMail({
      from: `"${primaryConfig.fromName || primaryConfig.fromEmail}" <${primaryConfig.fromEmail}>`,
      to,
      subject,
      html,
      attachments: normalized?.map((attachment) => ({
        filename: attachment.name,
        path: attachment.path,
        content: attachment.content,
        contentType: attachment.contentType
      })) ?? [],
      replyTo,
      cc,
      bcc,
    });

    return {
      success: true,
      usedFallback: false,
      messageId: result.messageId
    };

  } catch (primaryError) {
    const errorMsg = primaryError instanceof Error
      ? primaryError.message
      : String(primaryError);

    // Step 4: Decide if fallback should be tried
    const shouldFallback = 
      isFallbackTriggerError(primaryError) &&
      // error is fallback-worthy
      fallbackConfig != null;
      // fallback SMTP is configured for the resolved source

    if (!shouldFallback) {
      // Log to SmtpFallbackLog (fallbackUsed: false)
      await prisma.smtpFallbackLog.create({
        data: {
          userId,
          emailId,
          recipientEmail: recipientEmailStr,
          primaryError: errorMsg,
          primaryErrorCode: extractSmtpCode(errorMsg),
          fallbackUsed: false,
          fallbackSuccess: false,
          metadata: toJson({ source })
        }
      });

      return {
        success: false,
        usedFallback: false,
        error: errorMsg
      };
    }

    // Step 5: Attempt secondary SMTP
    console.log(`[mailer] Primary SMTP failed: ${errorMsg}`);
    console.log(`[mailer] Attempting fallback SMTP...`);

    try {
      const secondaryTransporter = createTransporterFromConfig(fallbackConfig!);

      const normalized = attachments ? await normalizeAttachments(userId, attachments) : undefined;

      const result = await secondaryTransporter.sendMail({
        from: `"${fallbackConfig!.fromName || fallbackConfig!.fromEmail}" <${fallbackConfig!.fromEmail}>`,
        to,
        subject,
        html,
        attachments: normalized?.map((attachment) => ({
          filename: attachment.name,
          path: attachment.path,
          content: attachment.content,
          contentType: attachment.contentType
        })) ?? [],
        replyTo,
        cc,
        bcc,
      });

      // Log successful fallback
      await prisma.smtpFallbackLog.create({
        data: {
          userId,
          emailId,
          recipientEmail: recipientEmailStr,
          primaryError: errorMsg,
          primaryErrorCode: extractSmtpCode(errorMsg),
          fallbackUsed: true,
          fallbackSuccess: true,
          fallbackAttemptAt: new Date(),
          metadata: toJson({ source })
        }
      });

      // Log audit events
      await logAudit(
        "smtp.fallback_used",
        userId,
        {
          primaryError: errorMsg,
          recipientEmail: recipientEmailStr,
          primarySmtp: primaryConfig.host,
          secondarySmtp: fallbackConfig?.host,
          source
        }
      );

      await logAudit(
        "smtp.fallback_success",
        userId,
        {
          recipientEmail: recipientEmailStr,
          secondarySmtp: fallbackConfig?.host,
          source
        }
      );

      console.log(`[mailer] Fallback SMTP succeeded ✅`);

      return {
        success: true,
        usedFallback: true,
        messageId: result.messageId
      };

    } catch (fallbackError) {
      const fallbackErrorMsg = 
        fallbackError instanceof Error
        ? fallbackError.message
        : String(fallbackError);

      // Log failed fallback
      await prisma.smtpFallbackLog.create({
        data: {
          userId,
          emailId,
          recipientEmail: recipientEmailStr,
          primaryError: errorMsg,
          primaryErrorCode: extractSmtpCode(errorMsg),
          fallbackUsed: true,
          fallbackSuccess: false,
          fallbackError: fallbackErrorMsg,
          fallbackAttemptAt: new Date(),
          metadata: toJson({ source })
        }
      });

      await logAudit(
        "smtp.fallback_failed",
        userId,
        {
          recipientEmail: recipientEmailStr,
          primaryError: errorMsg,
          fallbackError: fallbackErrorMsg,
          source
        }
      );

      console.error(`[mailer] Fallback SMTP also failed: ${fallbackErrorMsg}`);

      return {
        success: false,
        usedFallback: true,
        error: `Primary: ${errorMsg} | Fallback: ${fallbackErrorMsg}`,
        bothFailed: true,
        primaryError: errorMsg,
        fallbackError: fallbackErrorMsg
      };
    }
  }
}
