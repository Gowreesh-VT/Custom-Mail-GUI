import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const globalConfig = await prisma.systemConfig.findUnique({ where: { id: "singleton" } });
    const globalConfigured = Boolean(
      globalConfig?.globalSmtpActive &&
      globalConfig.smtpHost &&
      globalConfig.smtpPort &&
      globalConfig.smtpUsername &&
      globalConfig.smtpPasswordEnc &&
      globalConfig.smtpFromEmail
    );
    const userConfigured = Boolean(
      user.smtpConfig?.host &&
      user.smtpConfig?.port &&
      user.smtpConfig?.username &&
      user.smtpConfig?.passwordEnc &&
      user.smtpConfig?.fromEmail
    );
    return Response.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || "user", forcePasswordReset: Boolean(user.forcePasswordReset) },
      smtpConfigured: globalConfigured || userConfigured
    });
  } catch {
    return jsonError("Authentication required", 401, "AUTH_REQUIRED");
  }
}
