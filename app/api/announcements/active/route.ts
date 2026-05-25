import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { announcementRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], dismissals: { none: { userId: String(user._id) } } },
    include: { dismissals: true },
    orderBy: { createdAt: "desc" }
  });
  return Response.json({ success: true, announcements: announcements.map(announcementRecord) });
}
