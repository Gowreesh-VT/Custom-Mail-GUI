import nodemailer from "nodemailer";
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { decryptText } from "@/lib/encrypt";
import { jsonError } from "@/lib/utils";
import { SystemConfig } from "@/models/SystemConfig";

export async function POST(req: NextRequest) {
  await requireAdmin(req);
  const config = await SystemConfig.findOne().sort({ updatedAt: -1 }).lean();
  if (!config?.globalSmtp?.passwordEnc) return jsonError("Global SMTP is not configured", 400);
  const started = Date.now();
  await nodemailer.createTransport({
    host: config.globalSmtp.host,
    port: config.globalSmtp.port,
    secure: config.globalSmtp.encryption === "SSL" || config.globalSmtp.port === 465,
    auth: { user: config.globalSmtp.username, pass: decryptText(config.globalSmtp.passwordEnc) },
    tls: { rejectUnauthorized: config.globalSmtp.rejectUnauth !== false }
  } as any).verify();
  return Response.json({ success: true, latencyMs: Date.now() - started });
}
