import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const [sentToday, sentThisMonth, scheduled, drafts] = await Promise.all([
    prisma.email.count({ where: { userId: String(user._id), status: "sent", sentAt: { gte: today } } }),
    prisma.email.count({ where: { userId: String(user._id), status: "sent", sentAt: { gte: month } } }),
    prisma.scheduledEmail.count({ where: { userId: String(user._id), status: "pending" } }),
    prisma.draft.count({ where: { userId: String(user._id) } })
  ]);
  return Response.json({ success: true, sentToday, sentThisMonth, scheduled, drafts, dailyLimit: user.dailyLimit || 0, monthlyLimit: user.monthlyLimit || 0 });
}
