import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cookieOptions } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { connectToDatabase } from "@/lib/mongodb";
import { jsonError } from "@/lib/utils";
import { User } from "@/models/User";
import { logAudit } from "@/lib/audit";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = schema.parse(await req.json());
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      await logAudit("user.login_failed", undefined, { email: body.email }, undefined, req);
      return jsonError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    if (user.isActive === false) {
      await logAudit("user.login_failed", String(user._id), { reason: "deactivated" }, String(user._id), req);
      return jsonError("Your account has been deactivated. Contact your administrator.", 403, "ACCOUNT_DEACTIVATED");
    }
    const payload = { userId: String(user._id), email: user.email, role: user.role || "user", forcePasswordReset: Boolean(user.forcePasswordReset) };
    const res = NextResponse.json({ success: true, user: { name: user.name, email: user.email, role: user.role || "user", forcePasswordReset: Boolean(user.forcePasswordReset) } });
    res.cookies.set("accessToken", signToken(payload, "access"), cookieOptions(15 * 60));
    res.cookies.set("refreshToken", signToken(payload, "refresh"), cookieOptions(7 * 24 * 60 * 60));
    await logAudit("user.login", String(user._id), {}, String(user._id), req);
    return res;
  } catch (error: any) {
    return jsonError(error.message || "Unable to log in", 400);
  }
}
