import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cookieOptions } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { jsonError } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long")
});

export async function POST(req: NextRequest) {
  try {
    const body = signupSchema.parse(await req.json());
    const emailLower = body.email.toLowerCase();

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: emailLower }
    });
    if (existing) {
      return jsonError("Email already registered", 409, "EMAIL_EXISTS");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // Create user
    const created = await prisma.user.create({
      data: {
        name: body.name,
        email: emailLower,
        passwordHash: hashedPassword,
        role: "user",
        dailyLimit: 200,
        monthlyLimit: 2000,
        isActive: true,
        forcePasswordReset: false
      }
    });

    // Create JWT payload
    const role: "admin" | "user" = "user";
    const payload = {
      userId: created.id,
      email: created.email,
      role,
      forcePasswordReset: false
    };

    const res = NextResponse.json({
      success: true,
      user: {
        name: created.name,
        email: created.email,
        role,
        forcePasswordReset: false
      }
    });

    // Set auth cookies
    res.cookies.set("accessToken", signToken(payload, "access"), cookieOptions(15 * 60));
    res.cookies.set("refreshToken", signToken(payload, "refresh"), cookieOptions(7 * 24 * 60 * 60));

    // Log audit log
    await logAudit("user.signup", created.id, {}, created.id, req);

    return res;
  } catch (error: any) {
    return jsonError(error.message || "Unable to register", 400);
  }
}
