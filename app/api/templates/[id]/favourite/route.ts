import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const template = await prisma.template.findFirst({ where: { id, userId: String(user._id) } });
  if (!template) return jsonError("Template not found", 404);
  const updated = await prisma.template.update({ where: { id }, data: { isFavourite: !template.isFavourite } });
  return Response.json({ success: true, isFavourite: updated.isFavourite });
}
