import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  await prisma.email.updateMany({ where: { id, userId: String(user._id) }, data: { acknowledged: true } });
  return Response.json({ success: true });
}
