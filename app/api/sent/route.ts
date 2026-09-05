import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emailRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";

  const where: any = {
    userId: String(user._id)
  };

  if (q) {
    const conditions: any[] = [
      { subject: { contains: q, mode: "insensitive" } },
      { toAddresses: { contains: q, mode: "insensitive" } }
    ];
    if (q.toLowerCase() === "sent" || q.toLowerCase() === "failed") {
      conditions.push({ status: q.toLowerCase() });
    }
    where.OR = conditions;
  }

  const emails = await prisma.email.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: q ? 2000 : 100
  });

  return Response.json({
    success: true,
    count: emails.length,
    isSearch: Boolean(q),
    emails: emails.map(emailRecord)
  });
}
