import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { jsonError } from "@/lib/utils";

export function getTokenFromRequest(req: NextRequest, name = "accessToken") {
  return req.cookies.get(name)?.value;
}

export function getUserFromRequest(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) throw new Error("Missing access token");
  return verifyToken(token, "access");
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
