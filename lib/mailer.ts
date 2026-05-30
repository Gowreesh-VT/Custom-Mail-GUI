import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { access } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { decryptText } from "@/lib/encrypt";
import { resolveUserAttachmentPath } from "@/lib/security";

export interface SendPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  bodyHtml: string;
  attachments?: Array<{ name?: string; path?: string; content?: Buffer; contentType?: string }>;
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

type UserWithSmtp = {
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
      throw new Error("Invalid attachment payload");
    }
    const resolvedPath = resolveUserAttachmentPath(userId, attachment.path);
    await access(resolvedPath);
    normalized.push({
      name: filename,
      path: resolvedPath,
      contentType: attachment.contentType
    });
  }
  return normalized;
}
