import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { Draft } from "@/lib/models";
import { Email } from "@/lib/models";
import { ScheduledEmail } from "@/lib/models";
import { Template } from "@/lib/models";
import { User } from "@/lib/models";

export const dynamic = "force-dynamic";

const createSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8), role: z.enum(["admin", "user"]).default("user"), dailyLimit: z.number().default(500), monthlyLimit: z.number().default(10000) });

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const filter = url.searchParams.get("filter") || "all";
  const query: any = {};
  if (q) query.$or = [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }];
  if (filter === "active") query.isActive = { $ne: false };
  if (filter === "deactivated") query.isActive = false;
  if (filter === "admin") query.role = "admin";
  const users = await User.find(query).select("-passwordHash -smtpConfig.passwordEnc").sort({ createdAt: -1 }).lean();
  const counts = await Email.aggregate([{ $group: { _id: "$userId", sent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } } } }]);
  const sentMap = new Map(counts.map((item: any) => [String(item._id), item.sent]));
  return Response.json({ success: true, users: users.map((user: any) => ({ ...user, sentTotal: sentMap.get(String(user._id)) || 0 })) });
}

export async function POST(req: NextRequest) {
  try {
    const { user: admin } = await requireAdmin(req);
    const body = createSchema.parse(await req.json());
    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) return jsonError("Email already exists", 409, "EMAIL_EXISTS");
    const created = await User.create({ name: body.name, email: body.email.toLowerCase(), passwordHash: await bcrypt.hash(body.password, 12), role: body.role, dailyLimit: body.dailyLimit, monthlyLimit: body.monthlyLimit, isActive: true });
    await logAudit("admin.user_created", String(admin._id), { email: body.email, role: body.role }, String(created._id), req);
    return Response.json({ success: true, user: { _id: created._id, name: created.name, email: created.email } });
  } catch (error: any) {
    return jsonError(error.message || "Unable to create user", 400);
  }
}

export async function DELETE(req: NextRequest) {
  const { user: admin } = await requireAdmin(req);
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("User id is required", 400);
  await Promise.all([Email.deleteMany({ userId: id }), Draft.deleteMany({ userId: id }), Template.deleteMany({ userId: id }), ScheduledEmail.deleteMany({ userId: id }), User.deleteOne({ _id: id })]);
  await logAudit("admin.user_deleted", String(admin._id), {}, id, req);
  return Response.json({ success: true });
}
