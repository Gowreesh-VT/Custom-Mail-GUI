import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";

async function requireAdmin(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.payload.role !== "admin") throw new Error("Forbidden");
  return auth;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    let policy = await prisma.retentionPolicy.findUnique({
      where: { id: "singleton" }
    });
    if (!policy) {
      policy = await prisma.retentionPolicy.create({
        data: { id: "singleton", days: 30 }
      });
    }
    return Response.json({ success: true, days: policy.days });
  } catch (error: any) {
    return jsonError(error.message || "Forbidden", 403);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const days = Number(body.days);
    if (!days || days < 1) {
      return jsonError("Retention policy must be at least 1 day", 400);
    }
    const policy = await prisma.retentionPolicy.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", days },
      update: { days }
    });
    return Response.json({ success: true, days: policy.days });
  } catch (error: any) {
    return jsonError(error.message || "Forbidden", 403);
  }
}
