import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { Email } from "@/lib/models";
import { ScheduledEmail } from "@/lib/models";

export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const now = new Date();
  const today = startOfDay(now);
  const week = new Date(now);
  week.setDate(now.getDate() - 7);
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousWeek = new Date(week);
  previousWeek.setDate(week.getDate() - 7);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const failed7 = new Date(now);
  failed7.setDate(now.getDate() - 7);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);

  const [sentToday, sentWeek, sentMonth, failedLast7, pendingScheduled, bulkJobsRun, prevWeekSent, prevMonthSent, opensWeek, clicksWeek] = await Promise.all([
    Email.countDocuments({ userId: user._id, status: "sent", sentAt: { $gte: today } }),
    Email.countDocuments({ userId: user._id, status: "sent", sentAt: { $gte: week } }),
    Email.countDocuments({ userId: user._id, status: "sent", sentAt: { $gte: month } }),
    Email.countDocuments({ userId: user._id, status: "failed", acknowledged: false, sentAt: { $gte: failed7 } }),
    ScheduledEmail.countDocuments({ userId: user._id, status: "pending" }),
    Email.countDocuments({ userId: user._id, isBulk: true, sentAt: { $gte: month } }),
    Email.countDocuments({ userId: user._id, status: "sent", sentAt: { $gte: previousWeek, $lt: week } }),
    Email.countDocuments({ userId: user._id, status: "sent", sentAt: { $gte: previousMonth, $lt: month } }),
    Email.aggregate([{ $match: { userId: user._id, sentAt: { $gte: weekStart } } }, { $group: { _id: null, total: { $sum: "$openCount" } } }]),
    Email.aggregate([{ $match: { userId: user._id, sentAt: { $gte: weekStart } } }, { $group: { _id: null, total: { $sum: "$clickCount" } } }])
  ]);

  const delta = (current: number, previous: number) => (previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100));
  return Response.json({
    success: true,
    stats: [
      { key: "today", label: "Total Sent Today", value: sentToday, delta: 0 },
      { key: "week", label: "Total Sent This Week", value: sentWeek, delta: delta(sentWeek, prevWeekSent) },
      { key: "month", label: "Total Sent This Month", value: sentMonth, delta: delta(sentMonth, prevMonthSent) },
      { key: "failed", label: "Failed Last 7 Days", value: failedLast7, delta: 0 },
      { key: "scheduled", label: "Pending Scheduled", value: pendingScheduled, delta: 0 },
      { key: "bulk", label: "Bulk Jobs Run", value: bulkJobsRun, delta: 0 },
      { key: "opens", label: "Total Opens This Week", value: opensWeek[0]?.total || 0, delta: 0 },
      { key: "clicks", label: "Total Clicks This Week", value: clicksWeek[0]?.total || 0, delta: 0 }
    ]
  });
}
