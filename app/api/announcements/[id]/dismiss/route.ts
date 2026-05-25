import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) return jsonError("Announcement not found", 404);
  if (announcement.type === "critical") return jsonError("Critical announcements cannot be dismissed", 400);
  await prisma.announcementDismissal.upsert({
    where: { announcementId_userId: { announcementId: id, userId: String(user._id) } },
    update: {},
    create: { announcementId: id, userId: String(user._id) }
  });
  return Response.json({ success: true });
}
