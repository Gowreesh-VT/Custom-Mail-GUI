import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { Email } from "@/models/Email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const url = new URL(req.url);
  const range = Number(url.searchParams.get("days") || 7);
  const q = url.searchParams.get("q") || "";
  const since = new Date();
  since.setDate(since.getDate() - range);
  const filter: any = { userId: user._id, status: "failed", acknowledged: false, sentAt: { $gte: since } };
  if (q) filter.$or = [{ subject: new RegExp(q, "i") }, { to: new RegExp(q, "i") }, { errorMsg: new RegExp(q, "i") }];
  const failed = await Email.find(filter).sort({ sentAt: -1 }).limit(100).lean();
  return Response.json({ success: true, failed });
}
