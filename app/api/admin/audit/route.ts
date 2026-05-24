import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const userId = url.searchParams.get("userId");
  const q = url.searchParams.get("q");
  const filter: any = {};
  if (category && category !== "all") filter.category = category.toUpperCase();
  if (userId && userId !== "all") filter.userId = userId;
  if (q) filter.$or = [{ action: new RegExp(q, "i") }, { userName: new RegExp(q, "i") }, { targetName: new RegExp(q, "i") }];
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  const users = await User.find().select("name email").lean();
  return Response.json({ success: true, logs, users });
}
