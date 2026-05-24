import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";

export async function requireAdmin(req: NextRequest) {
  const ctx = await requireUser(req);
  if (ctx.user.role !== "admin") throw new Error("Admin access required");
  return ctx;
}

export function adminError() {
  return jsonError("Admin access required", 403, "ADMIN_REQUIRED");
}
