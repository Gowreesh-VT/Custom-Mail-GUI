import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const successParam = searchParams.get("success");

    const whereClause: any = { userId: String(user._id) };
    if (successParam === "true") {
      whereClause.fallbackSuccess = true;
    } else if (successParam === "false") {
      whereClause.fallbackSuccess = false;
    }

    const logs = await prisma.smtpFallbackLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        primaryError: true,
        primaryErrorCode: true,
        fallbackUsed: true,
        fallbackSuccess: true,
        fallbackError: true,
        primaryAttemptAt: true,
        fallbackAttemptAt: true,
        createdAt: true,
        recipientEmail: true,
        emailId: true
      }
    });

    return Response.json({ success: true, logs });
  } catch (error: any) {
    return jsonError(error.message, 401);
  }
}
