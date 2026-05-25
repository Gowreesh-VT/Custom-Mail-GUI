import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { announcementRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

const schema = z.object({ message: z.string().min(1), type: z.enum(["info", "warning", "critical"]), expiresAt: z.string().optional(), isActive: z.boolean().default(true) });

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const announcements = await prisma.announcement.findMany({ include: { dismissals: true }, orderBy: { createdAt: "desc" } });
  return Response.json({ success: true, announcements: announcements.map(announcementRecord) });
}

export async function POST(req: NextRequest) {
  const { user } = await requireAdmin(req);
  const body = schema.parse(await req.json());
  const announcement = await prisma.announcement.create({
    data: { message: body.message, type: body.type, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null, isActive: body.isActive, createdById: String(user._id) },
    include: { dismissals: true }
  });
  await logAudit("admin.announcement_created", String(user._id), { type: body.type }, announcement.id, req);
  return Response.json({ success: true, announcement: announcementRecord(announcement) });
}
