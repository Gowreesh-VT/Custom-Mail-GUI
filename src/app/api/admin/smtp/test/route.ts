import nodemailer from "nodemailer";
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { decryptText } from "@/lib/encrypt";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  await requireAdmin(req);
  const config = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
  if (!config?.smtpPasswordEnc) return jsonError("Global SMTP is not configured", 400);
  const started = Date.now();
  await nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpEncryption === "SSL" || config.smtpPort === 465,
    auth: { user: config.smtpUsername, pass: decryptText(config.smtpPasswordEnc) },
    tls: { rejectUnauthorized: config.smtpRejectUnauth !== false }
  } as any).verify();
  return Response.json({ success: true, latencyMs: Date.now() - started });
}
