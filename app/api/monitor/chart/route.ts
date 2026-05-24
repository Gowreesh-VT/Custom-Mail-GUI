import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { Email } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const days = Number(new URL(req.url).searchParams.get("days") || 30);
  // Compute UTC-aligned start date so persisted UTC timestamps produce keys that match the keys we build here.
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // move back (days - 1) days so the range includes today
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const rows = await Email.aggregate([
    { $match: { userId: user._id, sentAt: { $gte: since } } },
    { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$sentAt" } }, status: "$status" }, count: { $sum: 1 } } }
  ]);
  const map = new Map<string, { date: string; sent: number; failed: number }>();
  for (let i = 0; i < days; i++) {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    map.set(key, { date: key, sent: 0, failed: 0 });
  }
  rows.forEach((row: any) => {
    const item = map.get(row._id.day);
    if (item) item[row._id.status === "sent" ? "sent" : "failed"] = row.count;
  });
  return Response.json({ success: true, data: Array.from(map.values()) });
}
