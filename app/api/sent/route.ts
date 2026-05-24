import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { Email } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const filter: any = { userId: user._id };
  if (q) filter.$or = [{ subject: new RegExp(q, "i") }, { to: new RegExp(q, "i") }];
  const emails = await Email.find(filter).sort({ sentAt: -1 }).limit(100).lean();
  return Response.json({ success: true, emails });
}
