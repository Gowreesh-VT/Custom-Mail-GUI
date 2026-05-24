import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { Email } from "@/models/Email";
import { ScheduledEmail } from "@/models/ScheduledEmail";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const seven = new Date(now); seven.setDate(now.getDate() - 7);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const [totalUsers, emailsToday, emailsTotal, failed7, scheduledPending, bulkMonth, activeUsers, inactiveUsers] = await Promise.all([
    User.countDocuments(),
    Email.countDocuments({ status: "sent", sentAt: { $gte: today } }),
    Email.countDocuments({ status: "sent" }),
    Email.countDocuments({ status: "failed", sentAt: { $gte: seven } }),
    ScheduledEmail.countDocuments({ status: "pending" }),
    Email.countDocuments({ isBulk: true, sentAt: { $gte: month } }),
    User.countDocuments({ isActive: { $ne: false } }),
    User.countDocuments({ isActive: false })
  ]);
  const recent = await Email.find().sort({ sentAt: -1 }).limit(20).populate("userId", "name email").lean();
  const top = await Email.aggregate([
    { $match: { status: "sent", sentAt: { $gte: month } } },
    { $group: { _id: "$userId", sent: { $sum: 1 } } },
    { $sort: { sent: -1 } },
    { $limit: 5 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $project: { sent: 1, name: "$user.name", email: "$user.email" } }
  ]);
  return Response.json({ success: true, stats: { totalUsers, activeUsers, inactiveUsers, emailsToday, emailsTotal, failed7, scheduledPending, bulkMonth }, recent, top });
}
