import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    return Response.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || "user", forcePasswordReset: Boolean(user.forcePasswordReset) },
      smtpConfigured: Boolean(user.smtpConfig?.passwordEnc && user.smtpConfig?.host)
    });
  } catch {
    return jsonError("Authentication required", 401, "AUTH_REQUIRED");
  }
}
