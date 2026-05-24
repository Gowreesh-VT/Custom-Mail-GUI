import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { Announcement } from "@/models/Announcement";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin(req);
  const { id } = await params;
  const body = await req.json();
  const announcement = await Announcement.findByIdAndUpdate(id, body, { new: true });
  await logAudit("admin.announcement_created", String(user._id), { updated: true }, id, req);
  return Response.json({ success: true, announcement });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin(req);
  const { id } = await params;
  await Announcement.deleteOne({ _id: id });
  await logAudit("admin.announcement_deleted", String(user._id), {}, id, req);
  return Response.json({ success: true });
}
