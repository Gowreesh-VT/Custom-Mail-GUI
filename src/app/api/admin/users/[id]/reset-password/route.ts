import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({ password: z.string().min(8), forcePasswordReset: z.boolean().default(false) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin(req);
  const { id } = await params;
  const body = schema.parse(await req.json());
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(body.password, 12), forcePasswordReset: body.forcePasswordReset } });
  await logAudit(body.forcePasswordReset ? "user.force_reset" : "admin.password_reset", String(user._id), { forcePasswordReset: body.forcePasswordReset }, id, req);
  return Response.json({ success: true });
}
