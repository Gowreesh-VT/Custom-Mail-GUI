import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cookieOptions } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { jsonError } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { clearRateLimit, getRequestIp, rateLimitAttempt } from "@/lib/security";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase();
    const ip = getRequestIp(req);
    const rateKey = `user-login:${ip}:${email}`;
    const limiter = rateLimitAttempt(rateKey, 5, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return jsonError("Too many login attempts. Your account has been temporarily locked. Please contact the administrator at vt.gowreesh43@gmail.com.", 429, "RATE_LIMITED");
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isActive === false) {
      await logAudit("user.login_failed", undefined, { email: body.email }, undefined, req);
      return jsonError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    if (!(await bcrypt.compare(body.password, user.passwordHash))) {
      await logAudit("user.login_failed", undefined, { email: body.email }, undefined, req);
      return jsonError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    const role: "admin" | "user" = user.role === "admin" ? "admin" : "user";
    const payload = { userId: user.id, email: user.email, role, forcePasswordReset: Boolean(user.forcePasswordReset) };
    const res = NextResponse.json({ success: true, user: { name: user.name, email: user.email, role, forcePasswordReset: Boolean(user.forcePasswordReset) } });
    res.cookies.set("accessToken", signToken(payload, "access"), cookieOptions(15 * 60));
    res.cookies.set("refreshToken", signToken(payload, "refresh"), cookieOptions(7 * 24 * 60 * 60));
    clearRateLimit(rateKey);
    await logAudit("user.login", user.id, {}, user.id, req);
    return res;
  } catch (error: any) {
    return jsonError(error.message || "Unable to log in", 400);
  }
}
