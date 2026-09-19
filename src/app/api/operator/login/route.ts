import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { cookieOptions } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { clearRateLimit, getRequestIp, rateLimitAttempt } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const pin = String(body.pin || "").trim();
    const ip = getRequestIp(req);
    const rateKey = `operator-login:${ip}:${email}`;
    const limiter = rateLimitAttempt(rateKey, 5, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return jsonError("Too many PIN attempts. Try again later.", 429, "RATE_LIMITED");
    }

    if (!email || !pin) {
      return jsonError("Email and PIN are required", 400);
    }

    const operator = await prisma.qrOperator.findUnique({
      where: { email },
      include: { campaigns: { include: { campaign: true } } }
    });

    if (!operator) {
      return jsonError("Invalid credentials", 401);
    }

    if (!operator.isActive) {
      return jsonError("This operator account is deactivated", 403);
    }

    const pinMatch = await bcrypt.compare(pin, operator.pinHash);
    if (!pinMatch) {
      return jsonError("Invalid credentials", 401);
    }

    const payload = {
      userId: operator.id,
      email: operator.email,
      role: "user" as const // Standard payload compatibility
    };

    const res = NextResponse.json({
      success: true,
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
        campaigns: operator.campaigns.map((c) => ({
          id: c.campaign.id,
          name: c.campaign.name,
          type: c.campaign.type
        }))
      }
    });

    // Set operator cookie
    res.cookies.set("operatorToken", signToken(payload, "access"), cookieOptions(7 * 24 * 60 * 60)); // 7 days
    clearRateLimit(rateKey);
    
    return res;
  } catch (error: any) {
    return jsonError(error.message || "Failed to authenticate operator", 500);
  }
}
