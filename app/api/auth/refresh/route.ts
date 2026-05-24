import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions } from "@/lib/auth";
import { signToken, verifyToken } from "@/lib/jwt";
import { connectToDatabase } from "@/lib/mongodb";
import { jsonError } from "@/lib/utils";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const refresh = req.cookies.get("refreshToken")?.value;
    if (!refresh) return jsonError("Refresh token expired", 401, "REFRESH_EXPIRED");
    const payload = verifyToken(refresh, "refresh");
    await connectToDatabase();
    const user = await User.findById(payload.userId);
    if (!user || user.isActive === false) return jsonError("Refresh token expired", 401, "REFRESH_EXPIRED");
    const res = NextResponse.json({ success: true });
    res.cookies.set("accessToken", signToken({ userId: payload.userId, email: payload.email, role: user.role || "user", forcePasswordReset: Boolean(user.forcePasswordReset) }, "access"), cookieOptions(15 * 60));
    return res;
  } catch {
    return jsonError("Refresh token expired", 401, "REFRESH_EXPIRED");
  }
}
