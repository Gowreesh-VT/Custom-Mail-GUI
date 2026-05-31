import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { encryptText } from "@/lib/encrypt";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  enabled: z.boolean(),
  host: z.string().optional().nullable(),
  port: z.coerce.number().int().min(1).optional().nullable(),
  username: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  fromName: z.string().optional().nullable(),
  fromEmail: z.string().email().optional().nullable().or(z.literal("")).or(z.null()),
  encryption: z.enum(["TLS", "SSL", "NONE"]).optional().nullable(),
  rejectUnauth: z.boolean().default(true).optional().nullable()
});

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = putSchema.parse(await req.json());

    if (body.enabled && !body.host) {
      return jsonError("Secondary SMTP host is required when fallback is enabled", 400, "HOST_REQUIRED");
    }

    const passwordEnc = body.password ? encryptText(body.password) : user.smtpSecondaryPassEnc;

    await prisma.user.update({
      where: { id: String(user._id) },
      data: {
        smtpFallbackEnabled: body.enabled,
        smtpSecondaryHost: body.host || null,
        smtpSecondaryPort: body.port !== undefined ? body.port : null,
        smtpSecondaryUser: body.username || null,
        smtpSecondaryPassEnc: passwordEnc || null,
        smtpSecondaryFromName: body.fromName || null,
        smtpSecondaryFromEmail: body.fromEmail || null,
        smtpSecondaryEncryption: body.encryption || null,
        smtpSecondaryRejectUnauth: body.rejectUnauth !== false
      }
    });

    await logAudit({
      action: "smtp.fallback_configured",
      category: "EMAIL",
      userId: String(user._id),
      metadata: {
        enabled: body.enabled,
        secondaryHost: body.host || undefined
      },
      req
    });

    return Response.json({ success: true });
  } catch (error: any) {
    return jsonError(error.message || "Unable to save secondary SMTP settings", 400);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    return Response.json({
      success: true,
      enabled: user.smtpFallbackEnabled || false,
      host: user.smtpSecondaryHost || "",
      port: user.smtpSecondaryPort || 587,
      username: user.smtpSecondaryUser || "",
      fromName: user.smtpSecondaryFromName || "",
      fromEmail: user.smtpSecondaryFromEmail || "",
      encryption: user.smtpSecondaryEncryption || "TLS",
      rejectUnauth: user.smtpSecondaryRejectUnauth !== false,
      passwordSet: Boolean(user.smtpSecondaryPassEnc)
    });
  } catch (error: any) {
    console.error("GET /api/smtp/settings/secondary error:", error);
    if (error.message === "User not found") {
      return jsonError("Authentication required", 401, "AUTH_REQUIRED");
    }
    return jsonError(error.message, 500);
  }
}
