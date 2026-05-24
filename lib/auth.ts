import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  isActive: boolean;
  forcePasswordReset: boolean;
}

export function getTokenFromRequest(req: NextRequest, name = "accessToken") {
  return req.cookies.get(name)?.value;
}

export async function getUserFromRequest(req: NextRequest): Promise<AuthUser | null> {
  try {
    const token = getTokenFromRequest(req) ?? req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;

    const payload = verifyToken(token, "access");
    if (!payload.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        forcePasswordReset: true
      }
    });

    if (!user || !user.isActive) return null;
    return user as AuthUser;
  } catch {
    return null;
  }
}

export async function getUserIdFromCookies() {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) return null;
  try {
    return verifyToken(token, "access").userId;
  } catch {
    return null;
  }
}

export function authError() {
  return jsonError("Authentication required", 401, "AUTH_REQUIRED");
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };
}
