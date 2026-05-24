import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { decryptText } from "@/lib/encrypt";
import type { UserDocument } from "@/models/User";
import { SystemConfig } from "@/models/SystemConfig";

export interface SendPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  bodyHtml: string;
  attachments?: Array<{ name?: string; path?: string; content?: Buffer; contentType?: string }>;
}

export function hasSmtpConfig(user: UserDocument) {
  const config = user.smtpConfig;
  return Boolean(config?.host && config?.port && config?.username && config?.passwordEnc && config?.fromEmail);
}

function hasConfig(config: any) {
  return Boolean(config?.host && config?.port && config?.username && config?.passwordEnc && config?.fromEmail);
}

function createTransporterFromConfig(config: any) {
  if (!hasConfig(config)) throw new Error("SMTP config is incomplete");
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.encryption === "SSL" || config.port === 465,
    auth: {
      user: config.username,
      pass: decryptText(config.passwordEnc!)
    },
    tls: {
      rejectUnauthorized: config.rejectUnauth !== false
    }
  } as any);
}

export function createTransporter(user: UserDocument) {
  if (!hasSmtpConfig(user)) throw new Error("SMTP config is incomplete");
  return createTransporterFromConfig(user.smtpConfig!);
}

export async function getEffectiveSmtpConfig(user: UserDocument) {
  const systemConfig = await SystemConfig.findOne().sort({ updatedAt: -1 }).lean();
  if (systemConfig?.globalSmtpActive && hasConfig(systemConfig.globalSmtp)) {
    return systemConfig.globalSmtp;
  }
  return user.smtpConfig!;
}

export async function isGlobalSmtpActive() {
  const systemConfig = await SystemConfig.findOne().sort({ updatedAt: -1 }).lean();
  return Boolean(systemConfig?.globalSmtpActive);
}

export async function sendMailForUser(user: UserDocument, payload: SendPayload) {
  const config = await getEffectiveSmtpConfig(user);
  const transporter = createTransporterFromConfig(config);
  const options: Mail.Options = {
    from: `"${config.fromName || config.fromEmail}" <${config.fromEmail}>`,
    to: payload.to,
    cc: payload.cc,
    bcc: payload.bcc,
    replyTo: payload.replyTo,
    subject: payload.subject,
    html: payload.bodyHtml,
    attachments: payload.attachments?.map((attachment) => ({
      filename: attachment.name,
      path: attachment.path,
      content: attachment.content,
      contentType: attachment.contentType
    }))
  };
  return transporter.sendMail(options);
}
