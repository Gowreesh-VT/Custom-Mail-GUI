import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { Announcement } from "@/models/Announcement";

export const dynamic = "force-dynamic";

const schema = z.object({ message: z.string().min(1), type: z.enum(["info", "warning", "critical"]), expiresAt: z.string().optional(), isActive: z.boolean().default(true) });

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const announcements = await Announcement.find().sort({ createdAt: -1 }).lean();
  return Response.json({ success: true, announcements });
}

export async function POST(req: NextRequest) {
  const { user } = await requireAdmin(req);
  const body = schema.parse(await req.json());
  const announcement = await Announcement.create({ ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined, createdBy: user._id });
  await logAudit("admin.announcement_created", String(user._id), { type: body.type }, String(announcement._id), req);
  return Response.json({ success: true, announcement });
}
