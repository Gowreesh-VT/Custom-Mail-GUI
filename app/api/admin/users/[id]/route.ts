import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { AuditLog } from "@/lib/models";
import { Email } from "@/lib/models";
import { ScheduledEmail } from "@/lib/models";
import { Template } from "@/lib/models";
import { User } from "@/lib/models";

export const dynamic = "force-dynamic";

const updateSchema = z.object({ name: z.string().min(1), email: z.string().email(), role: z.enum(["admin", "user"]), dailyLimit: z.number(), monthlyLimit: z.number() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id } = await params;
  const user = await User.findById(id).select("-passwordHash -smtpConfig.passwordEnc").lean();
  if (!user) return jsonError("User not found", 404);
  const [emails, templates, audits, scheduledPending] = await Promise.all([
    Email.find({ userId: id }).sort({ sentAt: -1 }).limit(100).lean(),
    Template.find({ userId: id }).select("_id name mergeFields createdAt updatedAt").lean(),
    AuditLog.find({ $or: [{ userId: id }, { targetId: id }] }).sort({ createdAt: -1 }).limit(100).lean(),
    ScheduledEmail.countDocuments({ userId: id, status: "pending" })
  ]);
  return Response.json({ success: true, user, emails, templates, audits, scheduledPending });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: admin } = await requireAdmin(req);
  const { id } = await params;
  const body = updateSchema.parse(await req.json());
  const updated = await User.findByIdAndUpdate(id, body, { new: true }).select("-passwordHash -smtpConfig.passwordEnc");
  if (!updated) return jsonError("User not found", 404);
  await logAudit("admin.user_edited", String(admin._id), body, id, req);
  return Response.json({ success: true, user: updated });
}
