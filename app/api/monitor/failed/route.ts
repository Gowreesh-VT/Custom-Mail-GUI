import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emailRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const url = new URL(req.url);
  const range = Number(url.searchParams.get("days") || 7);
  const q = url.searchParams.get("q") || "";
  const since = new Date();
  since.setDate(since.getDate() - range);
  const failed = await prisma.email.findMany({
    where: {
      userId: String(user._id),
      status: "failed",
      acknowledged: false,
      sentAt: { gte: since },
      ...(q ? { OR: [{ subject: { contains: q, mode: "insensitive" as const } }, { toAddresses: { contains: q, mode: "insensitive" as const } }, { errorMsg: { contains: q, mode: "insensitive" as const } }] } : {})
    },
    orderBy: { sentAt: "desc" },
    take: 100
  });
  return Response.json({ success: true, failed: failed.map(emailRecord) });
}
