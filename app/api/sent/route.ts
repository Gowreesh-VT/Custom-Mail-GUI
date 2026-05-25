import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emailRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const emails = await prisma.email.findMany({
    where: {
      userId: String(user._id),
      ...(q ? { OR: [{ subject: { contains: q, mode: "insensitive" } }, { toAddresses: { contains: q, mode: "insensitive" } }] } : {})
    },
    orderBy: { sentAt: "desc" },
    take: 100
  });
  return Response.json({ success: true, emails: emails.map(emailRecord) });
}
