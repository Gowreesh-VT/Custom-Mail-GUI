import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const days = Number(new URL(req.url).searchParams.get("days") || 30);
  // Compute UTC-aligned start date so persisted UTC timestamps produce keys that match the keys we build here.
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // move back (days - 1) days so the range includes today
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const rows = await prisma.$queryRaw<{ day: string; status: string; count: bigint }[]>`
    SELECT TO_CHAR(DATE("sentAt"), 'YYYY-MM-DD') AS day, status, COUNT(*) AS count
    FROM "Email"
    WHERE "userId" = ${String(user._id)} AND "sentAt" >= ${since}
    GROUP BY DATE("sentAt"), status
    ORDER BY DATE("sentAt") ASC
  `;
  const map = new Map<string, { date: string; sent: number; failed: number }>();
  for (let i = 0; i < days; i++) {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    map.set(key, { date: key, sent: 0, failed: 0 });
  }
  rows.forEach((row) => {
    const item = map.get(row.day);
    if (item) item[row.status === "sent" ? "sent" : "failed"] = Number(row.count);
  });
  return Response.json({ success: true, data: Array.from(map.values()) });
}
