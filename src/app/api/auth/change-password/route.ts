import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { cookieOptions } from "@/lib/auth";
import { signToken } from "@/lib/jwt";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = schema.parse(await req.json());
    const matches = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!matches) return jsonError("Current password is incorrect", 401, "INCORRECT_PASSWORD");
    
    const updated = await prisma.user.update({
      where: { id: user._id },
      data: {
        passwordHash: await bcrypt.hash(body.newPassword, 12),
        forcePasswordReset: false
      }
    });

    const role: "admin" | "user" = updated.role === "admin" ? "admin" : "user";
    const payload = { userId: updated.id, email: updated.email, role, forcePasswordReset: false };
    
    const res = NextResponse.json({ success: true });
    res.cookies.set("accessToken", signToken(payload, "access"), cookieOptions(15 * 60));
    res.cookies.set("refreshToken", signToken(payload, "refresh"), cookieOptions(7 * 24 * 60 * 60));
    
    return res;
  } catch (error: any) {
    return jsonError(error.message || "Unable to change password", 400);
  }
}
