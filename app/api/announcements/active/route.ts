import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { Announcement } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const now = new Date();
  const announcements = await Announcement.find({
    isActive: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
    dismissedBy: { $ne: user._id }
  }).sort({ createdAt: -1 }).lean();
  return Response.json({ success: true, announcements });
}
