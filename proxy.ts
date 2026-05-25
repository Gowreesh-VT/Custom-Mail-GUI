import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = ["/login", "/signup"];
const publicApi = ["/api/auth/login", "/api/auth/signup", "/api/auth/refresh", "/api/auth/logout"];
const publicPrefixes = ["/api/track/open/", "/api/track/click/", "/api/cron/", "/api/qr/img/", "/api/qr/validate", "/api/qr/operator/auth"];
const publicStandaloneRoutes = ["/scan"];

async function verifyAccessToken(token: string) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature || !process.env.JWT_ACCESS_SECRET) return false;
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.JWT_ACCESS_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  if (expected !== signature) return false;
  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
  const paddedPayload = normalizedPayload.padEnd(
    normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
    "="
  );
  const parsed = JSON.parse(atob(paddedPayload));
  if (parsed.type !== "access" || parsed.exp * 1000 <= Date.now()) return false;
  return parsed as { role?: string; forcePasswordReset?: boolean };
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    publicStandaloneRoutes.includes(pathname) ||
    publicRoutes.includes(pathname) ||
    publicApi.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("accessToken")?.value;
  if (token) {
    const payload = await verifyAccessToken(token);
    if (payload) {
      if (pathname.startsWith("/admin") && payload.role !== "admin") {
        return NextResponse.redirect(new URL("/compose", req.url));
      }
      if (payload.forcePasswordReset && !pathname.startsWith("/settings") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/")) {
        return NextResponse.redirect(new URL("/settings", req.url));
      }
      return NextResponse.next();
    }
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "Authentication required", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
