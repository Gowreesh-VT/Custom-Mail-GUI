import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { encryptText } from "@/lib/encrypt";
import { SystemConfig } from "@/models/SystemConfig";
import { User } from "@/models/User";

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
  const config = await SystemConfig.findOne().sort({ updatedAt: -1 }).lean();
  const users = await User.find().select("name email smtpConfig smtpHealthLog").lean();
  return Response.json({
    success: true,
    config: {
      globalSmtpActive: Boolean(config?.globalSmtpActive),
      globalSmtp: config?.globalSmtp ? { ...config.globalSmtp, passwordEnc: undefined, hasPassword: Boolean(config.globalSmtp.passwordEnc) } : {}
    },
    users: users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      host: user.smtpConfig?.host || "",
      lastTested: user.smtpHealthLog?.at(-1)?.testedAt,
      status: user.smtpHealthLog?.at(-1)?.success
    }))
  });
}

export async function PUT(req: NextRequest) {
  const { user } = await requireAdmin(req);
  const body = schema.parse(await req.json());
  const existing = await SystemConfig.findOne().sort({ updatedAt: -1 });
  const current = existing || new SystemConfig();
  current.globalSmtpActive = body.globalSmtpActive;
  if (body.globalSmtp) {
    current.globalSmtp = {
      host: body.globalSmtp.host,
      port: body.globalSmtp.port,
      username: body.globalSmtp.username,
      passwordEnc: body.globalSmtp.password ? encryptText(body.globalSmtp.password) : current.globalSmtp?.passwordEnc,
      fromName: body.globalSmtp.fromName,
      fromEmail: body.globalSmtp.fromEmail,
      encryption: body.globalSmtp.encryption,
      rejectUnauth: body.globalSmtp.rejectUnauth
    };
  }
  current.updatedBy = user._id as any;
  await current.save();
  await logAudit(body.globalSmtpActive ? "admin.smtp_override_enabled" : "admin.smtp_override_disabled", String(user._id), { smtpHost: current.globalSmtp?.host }, undefined, req);
  return Response.json({ success: true });
}
