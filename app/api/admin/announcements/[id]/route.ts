import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { Announcement } from "@/lib/models";
import { jsonError } from "@/lib/utils";

const updateSchema = z.object({
  message: z.string().min(1).optional(),
  type: z.enum(["info", "warning", "critical"]).optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().optional()
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin(req);
  const { id } = await params;
  const body = updateSchema.parse(await req.json());
  const update = {
    ...body,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : body.expiresAt === null ? null : undefined
  };
  const announcement = await Announcement.findByIdAndUpdate(id, update);
  if (!announcement) return jsonError("Announcement not found", 404, "ANNOUNCEMENT_NOT_FOUND");

  await logAudit("admin.announcement_updated", String(user._id), { updated: true }, id, req);
  return Response.json({ success: true, announcement });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAdmin(req);
  const { id } = await params;
  await Announcement.deleteOne({ _id: id });
  await logAudit("admin.announcement_deleted", String(user._id), {}, id, req);
  return Response.json({ success: true });
}
