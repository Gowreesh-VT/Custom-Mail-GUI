import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { userRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

const createSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8), role: z.enum(["admin", "user"]).default("user"), dailyLimit: z.number().default(200), monthlyLimit: z.number().default(2000) });

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const filter = url.searchParams.get("filter") || "all";
  const users = await prisma.user.findMany({
    where: {
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}),
      ...(filter === "active" ? { isActive: { not: false } } : {}),
      ...(filter === "deactivated" ? { isActive: false } : {}),
      ...(filter === "admin" ? { role: "admin" } : {})
    },
    orderBy: { createdAt: "desc" },
    include: {
      smtpHealthLogs: { orderBy: { testedAt: "desc" }, take: 10 },
      smtpPool: true
    }
  });
  const counts = await prisma.email.groupBy({ by: ["userId"], where: { status: "sent" }, _count: { _all: true } });
  const sentMap = new Map(counts.map((item) => [item.userId, item._count._all]));
  return Response.json({
    success: true,
    users: users.map((user) => {
      const adminPrimary = user.smtpPool.find((smtp) => smtp.isAdminAssigned && smtp.isPrimary && smtp.isActive);
      const ownPrimary = user.smtpPool.find((smtp) => !smtp.isAdminAssigned && smtp.isPrimary && smtp.isActive);
      const primary = user.adminSmtpLocked ? adminPrimary : ownPrimary;
      const hasOwnSmtp = user.smtpPool.some((smtp) => !smtp.isAdminAssigned && smtp.isActive) || Boolean(user.smtpHost);
      return {
        ...userRecord(user),
        passwordHash: undefined,
        smtpPasswordEnc: undefined,
        sentTotal: sentMap.get(user.id) || 0,
        smtpSummary: {
          lockStatus: user.adminSmtpLocked ? "locked" : "unlocked",
          label: user.adminSmtpLocked && adminPrimary ? "Locked" : hasOwnSmtp ? "Own SMTP" : "No SMTP",
          status: primary?.lastTestSuccess ?? null,
          hasConfig: Boolean(primary || hasOwnSmtp)
        }
      };
    })
  });
}

export async function POST(req: NextRequest) {
  try {
    const { user: admin } = await requireAdmin(req);
    const body = createSchema.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) return jsonError("Email already exists", 409, "EMAIL_EXISTS");
    const created = await prisma.user.create({ data: { name: body.name, email: body.email.toLowerCase(), passwordHash: await bcrypt.hash(body.password, 12), role: body.role, dailyLimit: body.dailyLimit, monthlyLimit: body.monthlyLimit, isActive: true } });
    await logAudit("admin.user_created", String(admin._id), { email: body.email, role: body.role }, created.id, req);
    return Response.json({ success: true, user: { _id: created.id, name: created.name, email: created.email } });
  } catch (error: any) {
    return jsonError(error.message || "Unable to create user", 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user: admin } = await requireAdmin(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return jsonError("User id is required", 400);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return jsonError("User not found", 404, "USER_NOT_FOUND");

    await prisma.user.delete({ where: { id } });
    await logAudit("admin.user_deleted", String(admin._id), {}, id, req);
    return Response.json({ success: true });
  } catch (error: any) {
    return jsonError(error.message || "Unable to delete user", 400);
  }
}
