import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { encryptText } from "@/lib/encrypt";
import { jsonError } from "@/lib/utils";
import { isGlobalSmtpActive } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const schema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1),
  username: z.string().min(1),
  password: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email(),
  encryption: z.enum(["TLS", "SSL", "NONE"]),
  rejectUnauth: z.boolean().default(true)
});

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const config = user.smtpConfig || {};
    return Response.json({
      success: true,
      smtpConfig: {
        host: config.host || "",
        port: config.port || 587,
        username: config.username || "",
        fromName: config.fromName || "",
        fromEmail: config.fromEmail || "",
        encryption: config.encryption || "TLS",
        rejectUnauth: config.rejectUnauth !== false,
        hasPassword: Boolean(config.passwordEnc)
      },
      smtpHealthLog: user.smtpHealthLog || [],
      globalSmtpActive: await isGlobalSmtpActive()
    });
  } catch (error: any) {
    return jsonError(error.message, 401);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = schema.parse(await req.json());
    user.smtpConfig = {
      host: body.host,
      port: body.port,
      username: body.username,
      passwordEnc: body.password ? encryptText(body.password) : user.smtpConfig?.passwordEnc,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
      encryption: body.encryption,
      rejectUnauth: body.rejectUnauth
    };
    if (!user.smtpConfig.passwordEnc) return jsonError("SMTP password is required", 400, "SMTP_PASSWORD_REQUIRED");
    await user.save();
    return Response.json({ success: true });
  } catch (error: any) {
    return jsonError(error.message || "Unable to save SMTP settings", 400);
  }
}
