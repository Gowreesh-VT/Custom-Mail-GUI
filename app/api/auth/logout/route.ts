import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    await logAudit("user.logout", user?.id, {}, user?.id, req);
  } catch {}
  const res = NextResponse.json({ success: true });
  res.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
  res.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });
  return res;
}
