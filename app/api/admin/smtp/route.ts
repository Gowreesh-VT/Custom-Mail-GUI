import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { encryptText } from "@/lib/encrypt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  globalSmtpActive: z.boolean(),
  globalSmtp: z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    fromName: z.string().optional(),
    fromEmail: z.string().optional(),
    encryption: z.enum(["TLS", "SSL", "NONE"]).default("TLS"),
    rejectUnauth: z.boolean().default(true)
  }).optional()
});

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const config = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      smtpHost: true,
      smtpHealthLogs: {
        orderBy: { testedAt: "desc" },
        take: 1,
        select: { success: true, testedAt: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return Response.json({
    success: true,
    config: {
      globalSmtpActive: Boolean(config?.globalSmtpActive),
      globalSmtp: config
        ? {
            host: config.smtpHost,
            port: config.smtpPort,
            username: config.smtpUsername,
            fromName: config.smtpFromName,
            fromEmail: config.smtpFromEmail,
            encryption: config.smtpEncryption,
            rejectUnauth: config.smtpRejectUnauth,
            hasPassword: Boolean(config.smtpPasswordEnc)
          }
        : {}
    },
    users: users.map((user) => ({
      _id: user.id,
      name: user.name,
      email: user.email,
      host: user.smtpHost || "",
      lastTested: user.smtpHealthLogs[0]?.testedAt,
      status: user.smtpHealthLogs[0]?.success
    }))
  });
}

export async function PUT(req: NextRequest) {
  const { user } = await requireAdmin(req);
  const body = schema.parse(await req.json());
  const existing = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
  const smtp = body.globalSmtp;
  const data = {
    globalSmtpActive: body.globalSmtpActive,
    smtpHost: smtp?.host ?? null,
    smtpPort: smtp?.port ?? null,
    smtpUsername: smtp?.username ?? null,
    smtpPasswordEnc: smtp?.password ? encryptText(smtp.password) : existing?.smtpPasswordEnc ?? null,
    smtpFromName: smtp?.fromName ?? null,
    smtpFromEmail: smtp?.fromEmail ?? null,
    smtpEncryption: smtp?.encryption ?? "TLS",
    smtpRejectUnauth: smtp?.rejectUnauth ?? true,
    updatedById: String(user._id)
  };

  await prisma.systemConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data
  });

  await logAudit(body.globalSmtpActive ? "admin.smtp_override_enabled" : "admin.smtp_override_disabled", String(user._id), { smtpHost: data.smtpHost }, undefined, req);
  return Response.json({ success: true });
}
