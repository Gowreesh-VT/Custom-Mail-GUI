import { type NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userRecord } from "@/lib/records";

export async function requireUser(req: NextRequest) {
  const payload = await getUserFromRequest(req);
  if (!payload) throw new Error("User not found");
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: { smtpHealthLogs: { orderBy: { testedAt: "desc" }, take: 20 } }
  });
  if (!user) throw new Error("User not found");
  return { payload, user: userRecord(user) };
}
