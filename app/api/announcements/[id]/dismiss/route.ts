import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { Announcement } from "@/lib/models";
import { jsonError } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const announcement = await Announcement.findById(id);
  if (!announcement) return jsonError("Announcement not found", 404);
  if (announcement.type === "critical") return jsonError("Critical announcements cannot be dismissed", 400);
  await Announcement.updateOne({ _id: id }, { $addToSet: { dismissedBy: user._id } });
  return Response.json({ success: true });
}
