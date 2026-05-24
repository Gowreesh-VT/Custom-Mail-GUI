import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { Email } from "@/models/Email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const days = Number(new URL(req.url).searchParams.get("days") || 30);
  const since = new Date(); since.setDate(since.getDate() - days + 1); since.setHours(0, 0, 0, 0);
  const volume = await Email.aggregate([
    { $match: { sentAt: { $gte: since } } },
    { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$sentAt" } }, status: "$status" }, count: { $sum: 1 } } }
  ]);
  const byUser = await Email.aggregate([
    { $match: { sentAt: { $gte: since } } },
    { $group: { _id: { userId: "$userId", status: "$status" }, count: { $sum: 1 } } },
    { $lookup: { from: "users", localField: "_id.userId", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $group: { _id: "$_id.userId", name: { $first: "$user.name" }, sent: { $sum: { $cond: [{ $eq: ["$_id.status", "sent"] }, "$count", 0] } }, failed: { $sum: { $cond: [{ $eq: ["$_id.status", "failed"] }, "$count", 0] } } } },
    { $sort: { sent: -1 } },
    { $limit: 20 }
  ]);
  const status = await Email.aggregate([{ $group: { _id: "$status", value: { $sum: 1 } } }]);
  return Response.json({ success: true, volume, byUser, status });
}
